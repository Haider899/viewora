import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
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
   * Purchase a package using user's wallet available balance.
   * Atomically executes double-entry ledger debit & credit, snapshots terms, and generates net revenue event.
   */
  static async purchasePackageWithWallet(userId: string, packageId: string, payCurrency: string = 'USD') {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw { statusCode: 400, code: 'PACKAGE_UNAVAILABLE', message: 'The requested package is inactive or not found.' };
    }

    // Determine exchange rate for PKR conversions
    let exchangeRate = 280;
    const rateSetting = await prisma.systemSetting.findUnique({ where: { key: 'EXCHANGE_RATE_USD_PKR' } });
    if (rateSetting && !isNaN(parseFloat(rateSetting.value))) {
      exchangeRate = parseFloat(rateSetting.value);
    }

    const chosenCurrency = (payCurrency === 'PKR' ? 'PKR' : 'USD') as Currency;
    const amountToDeductCents = chosenCurrency === 'PKR'
      ? Math.round((pkg.priceCents * exchangeRate) / 100) * 100
      : pkg.priceCents;

    return await prisma.$transaction(async (tx) => {
      // 1. Get or create user wallet account
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
          message: `Insufficient ${chosenCurrency} balance. Required: ${(amountToDeductCents / 100).toLocaleString()} ${chosenCurrency}, Available: ${(userAccount.balanceCents / 100).toLocaleString()} ${chosenCurrency}.`,
        };
      }

      // 2. Get system revenue account
      const systemRevAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_REVENUE_PACKAGES,
        chosenCurrency,
        null
      );

      // 3. Post double-entry transaction
      const reference = `PKG-BUY-${userId.slice(0, 8)}-${pkg.id.slice(0, 8)}-${Date.now()}`;
      await LedgerService.postTransaction(
        {
          reference,
          transactionType: LedgerTransactionType.PACKAGE_PURCHASE,
          currency: chosenCurrency,
          description: `Package purchase: ${pkg.name} (${chosenCurrency === 'PKR' ? `${(amountToDeductCents / 100).toLocaleString()} PKR` : `$${(pkg.priceCents / 100).toFixed(2)} USD`})`,
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

      // 4. Create immutable PackagePurchase with historical terms
      const purchase = await tx.packagePurchase.create({
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

      // 5. Create Revenue Event for verified net revenue linkage
      const revenueEvent = await tx.revenueEvent.create({
        data: {
          sourcePurchaseId: purchase.id,
          amountCents: amountToDeductCents,
          currency: chosenCurrency,
        },
      });

      // 6. Process referral commission if applicable
      await ReferralService.processCommissionForRevenueEvent(
        userId,
        revenueEvent.id,
        amountToDeductCents,
        chosenCurrency,
        tx
      );

      return purchase;
    });
  }

  // Admin package management
  static async createPackage(data: {
    name: string;
    priceCents: number;
    currency?: string;
    videoLimit: number;
    description?: string;
    badge?: string;
    features: string[];
  }) {
    return await prisma.package.create({
      data: {
        name: data.name,
        priceCents: data.priceCents,
        currency: data.currency || 'USD',
        videoLimit: data.videoLimit,
        description: data.description,
        badge: data.badge,
        features: JSON.stringify(data.features),
        isActive: true,
      },
    });
  }

  static async updatePackage(id: string, data: Partial<{
    name: string;
    priceCents: number;
    videoLimit: number;
    description: string;
    badge: string;
    features: string[];
    isActive: boolean;
  }>) {
    const updateData: any = { ...data };
    if (data.features) {
      updateData.features = JSON.stringify(data.features);
    }
    return await prisma.package.update({
      where: { id },
      data: updateData,
    });
  }
}
