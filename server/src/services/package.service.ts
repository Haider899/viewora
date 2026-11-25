import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountLevelService } from './accountLevel.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';
import { ReferralService } from './referral.service.js';

export class PackageService {
  static async getAllPackages(onlyActive = true) {
    return await prisma.package.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { priceCents: 'asc' },
    });
  }

  static async getPackageById(id: string) {
    return await prisma.package.findUnique({
      where: { id },
    });
  }

  static async getUserActivePackage(userId: string) {
    return await prisma.packagePurchase.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { purchasedAt: 'desc' },
      include: { package: true },
    });
  }

  static async getUserPurchases(userId: string) {
    return await prisma.packagePurchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
      include: { package: true },
    });
  }

  /**
   * Purchase a package using user's USD Main Account balance.
   */
  static async purchasePackageWithWallet(userId: string, packageId: string) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw { statusCode: 400, code: 'PACKAGE_UNAVAILABLE', message: 'The requested package is inactive or not found.' };
    }

    const chosenCurrency = Currency.USD;
    const amountToDeductCents = pkg.priceCents;

    const purchase = await prisma.$transaction(async (tx) => {
      const userAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
        chosenCurrency,
        userId
      );

      if (userAccount.balanceCents < amountToDeductCents) {
        throw {
          statusCode: 400,
          code: 'INSUFFICIENT_FUNDS',
          message: `Insufficient USD balance. Required: $${(amountToDeductCents / 100).toFixed(2)} USD, Available: $${(userAccount.balanceCents / 100).toFixed(2)} USD.`,
        };
      }

      const systemRevAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_REVENUE_PACKAGES,
        chosenCurrency,
        null
      );

      const reference = `PKG-BUY-${userId.slice(0, 8)}-${pkg.id.slice(0, 8)}-${Date.now()}`;
      await LedgerService.postTransaction(
        {
          reference,
          transactionType: LedgerTransactionType.PACKAGE_PURCHASE,
          currency: chosenCurrency,
          description: `Package purchase: ${pkg.name} ($${(pkg.priceCents / 100).toFixed(2)} USD)`,
          entries: [
            {
              accountId: userAccount.id,
              entryType: EntryType.DEBIT,
              amountCents: amountToDeductCents,
            },
            {
              accountId: systemRevAccount.id,
              entryType: EntryType.CREDIT,
              amountCents: amountToDeductCents,
            },
          ],
        },
        tx
      );

      const newPurchase = await tx.packagePurchase.create({
        data: {
          userId,
          packageId: pkg.id,
          packageName: pkg.name,
          priceCentsPaid: amountToDeductCents,
          currency: chosenCurrency,
          videoLimitGranted: pkg.videoLimit,
          status: 'ACTIVE',
        },
      });

      const revenueEvent = await tx.revenueEvent.create({
        data: {
          sourcePurchaseId: newPurchase.id,
          amountCents: amountToDeductCents,
          currency: chosenCurrency,
        },
      });

      await ReferralService.processCommissionForRevenueEvent(
        userId,
        revenueEvent.id,
        amountToDeductCents,
        chosenCurrency,
        tx
      );

      return newPurchase;
    });

    await NotificationService.send({
      userId,
      eventKey: 'rewardCredited',
      title: `${pkg.name} Plan Activated`,
      message: `Your ${pkg.name} access plan ($${(pkg.priceCents / 100).toFixed(2)} USD) is now active! You can access up to ${pkg.videoLimit} videos.`,
      type: 'SUCCESS',
    });

    await AccountLevelService.calculateAndUpdateUserLevel(userId).catch(() => {});

    return purchase;
  }

  // Admin package CRUD management
  static async createPackage(adminId: string, data: {
    name: string;
    priceCents: number;
    videoLimit: number;
    description?: string;
    badge?: string;
    features?: string[];
    isActive?: boolean;
  }) {
    const created = await prisma.package.create({
      data: {
        name: data.name.trim(),
        priceCents: data.priceCents,
        currency: 'USD',
        videoLimit: data.videoLimit,
        description: data.description || '',
        badge: data.badge || null,
        features: JSON.stringify(data.features || []),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_PACKAGE',
        resourceType: 'Package',
        resourceId: created.id,
        details: JSON.stringify({ name: created.name, priceCents: created.priceCents, videoLimit: created.videoLimit }),
      },
    });

    return created;
  }

  static async updatePackage(adminId: string, id: string, data: Partial<{
    name: string;
    priceCents: number;
    videoLimit: number;
    description: string;
    badge: string;
    features: string[];
    isActive: boolean;
  }>) {
    const updateData: any = { ...data, currency: 'USD' };
    if (Array.isArray(data.features)) {
      updateData.features = JSON.stringify(data.features);
    }

    const updated = await prisma.package.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_PACKAGE',
        resourceType: 'Package',
        resourceId: id,
        details: JSON.stringify(data),
      },
    });

    return updated;
  }

  static async deletePackage(adminId: string, id: string) {
    const purchaseCount = await prisma.packagePurchase.count({ where: { packageId: id } });
    if (purchaseCount > 0) {
      const deactivated = await prisma.package.update({ where: { id }, data: { isActive: false } });
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'DEACTIVATE_PACKAGE',
          resourceType: 'Package',
          resourceId: id,
          details: JSON.stringify({ reason: 'Existing purchases present; deactivated.' }),
        },
      });
      return deactivated;
    }

    const deleted = await prisma.package.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_PACKAGE',
        resourceType: 'Package',
        resourceId: id,
        details: JSON.stringify({ name: deleted.name }),
      },
    });
    return deleted;
  }
}
