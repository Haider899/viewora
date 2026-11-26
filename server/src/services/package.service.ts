import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountLevelService } from './accountLevel.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';
import { ReferralService } from './referral.service.js';
import { DEFAULT_BONUS_SETTINGS } from './bootstrap.service.js';

export class PackageService {
  static async getAllPackages(onlyActive = true, userId?: string) {
    const [packages, bonusRow, refConfig, activePurchase, publishedVideos] = await Promise.all([
      prisma.package.findMany({
        where: onlyActive ? { isActive: true } : {},
        orderBy: { priceCents: 'asc' },
      }),
      prisma.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } }),
      ReferralService.getReferralConfig().catch(() => null),
      userId
        ? prisma.packagePurchase.findFirst({
            where: { userId, status: 'ACTIVE' },
            orderBy: { purchasedAt: 'desc' },
            include: { package: true },
          })
        : Promise.resolve(null),
      prisma.video.findMany({
        where: { isPublished: true, assignedUserId: null },
        select: { minAccountLevel: true, minPackageTier: true, rewardAmountCents: true, isLocked: true },
      }),
    ]);

    let bonusSettings = DEFAULT_BONUS_SETTINGS;
    if (bonusRow) {
      try {
        bonusSettings = { ...DEFAULT_BONUS_SETTINGS, ...JSON.parse(bonusRow.value) };
      } catch {}
    }
    const videoBonus: any = bonusSettings.videoBonus || DEFAULT_BONUS_SETTINGS.videoBonus;
    const baseRewardCents = Number(videoBonus.defaultRewardCents ?? 50);
    const globalPct = Number(videoBonus.globalPercent ?? 100);
    const levelPcts: Record<string, number> = videoBonus.levelPercentages || {
      LEVEL_1: 100,
      LEVEL_2: 125,
      LEVEL_3: 150,
      LEVEL_4: 200,
      LEVEL_5: 250,
    };

    const levelRank: Record<string, number> = {
      NEW_USER: 0,
      LEVEL_1: 1,
      LEVEL_2: 2,
      LEVEL_3: 3,
      LEVEL_4: 4,
      LEVEL_5: 5,
    };

    const currentPriceCents = activePurchase?.package?.priceCents ?? activePurchase?.priceCentsPaid ?? 0;

    return packages.map((pkg, idx) => {
      const levelKey = AccountLevelService.mapPackageToLevel(pkg.name, packages);
      const pkgRank = levelRank[levelKey] ?? idx + 1;
      const lvlPct = Number(levelPcts[levelKey] ?? 100);
      const perVideoRewardCents = Math.max(
        1,
        Math.round((baseRewardCents * (globalPct / 100)) * (lvlPct / 100))
      );

      // Count actual published catalog videos unlocked at or below this package's level
      const unlockedAdsCount = publishedVideos.filter((v) => {
        if (v.isLocked) return false;
        const vRank = levelRank[v.minAccountLevel || 'LEVEL_1'] ?? 1;
        return vRank <= pkgRank;
      }).length;

      const isCurrentPlan = Boolean(activePurchase && activePurchase.packageId === pkg.id);
      const isOwnedOrLower = Boolean(activePurchase && pkg.priceCents <= currentPriceCents);
      const isUpgrade = Boolean(activePurchase && pkg.priceCents > currentPriceCents);
      const upgradeDiffCents = isUpgrade ? Math.max(0, pkg.priceCents - currentPriceCents) : pkg.priceCents;

      const pos1Rate = refConfig?.commissionRates?.pos1 ?? 5;
      const pos5Rate = refConfig?.commissionRates?.pos5 ?? 15;

      return {
        ...pkg,
        levelKey,
        isLifetime: true,
        perVideoRewardCents,
        unlockedAdsCount: unlockedAdsCount > 0 ? unlockedAdsCount : pkg.videoLimit,
        referralRateRange: `${pos1Rate}%–${pos5Rate}%`,
        isCurrentPlan,
        isOwnedOrLower,
        isUpgrade,
        currentPlanName: activePurchase?.packageName || null,
        currentPlanPriceCents: currentPriceCents,
        upgradeDiffCents,
        effectiveCostCents: upgradeDiffCents,
      };
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
   * Lifetime package subscription or upgrade (Part 1 Rules 1, 3, 4 & Part 3 #4).
   * Upgrading from an active package charges ONLY the price difference!
   */
  static async purchasePackageWithWallet(userId: string, packageId: string) {
    const pkg = await prisma.package.findUnique({
      where: { id: packageId },
    });

    if (!pkg || !pkg.isActive) {
      throw { statusCode: 400, code: 'PACKAGE_UNAVAILABLE', message: 'The requested package is inactive or not found.' };
    }

    const activePurchase = await prisma.packagePurchase.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { purchasedAt: 'desc' },
      include: { package: true },
    });

    let isUpgrade = false;
    let amountToDeductCents = pkg.priceCents;
    let previousPackageName: string | null = null;

    if (activePurchase) {
      const currentValueCents = activePurchase.package?.priceCents ?? activePurchase.priceCentsPaid;
      if (pkg.id === activePurchase.packageId || pkg.priceCents <= currentValueCents) {
        throw {
          statusCode: 400,
          code: 'ALREADY_ON_TIER_OR_HIGHER',
          message: `You already hold the ${activePurchase.packageName} lifetime plan ($${(currentValueCents / 100).toFixed(2)}). Choose a higher tier to upgrade.`,
        };
      }
      isUpgrade = true;
      previousPackageName = activePurchase.packageName;
      amountToDeductCents = Math.max(0, pkg.priceCents - currentValueCents);
    }

    const chosenCurrency = Currency.USD;

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
          message: `Insufficient subscription credit. Required: $${(amountToDeductCents / 100).toFixed(2)} USD, Available Deposit Credit: $${(userAccount.balanceCents / 100).toFixed(2)} USD. Please deposit funds first.`,
        };
      }

      const systemRevAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_REVENUE_PACKAGES,
        chosenCurrency,
        null
      );

      if (amountToDeductCents > 0) {
        const reference = `${isUpgrade ? 'PKG-UPG' : 'PKG-BUY'}-${userId.slice(0, 8)}-${pkg.id.slice(0, 8)}-${Date.now()}`;
        await LedgerService.postTransaction(
          {
            reference,
            transactionType: LedgerTransactionType.PACKAGE_PURCHASE,
            currency: chosenCurrency,
            description: isUpgrade
              ? `Package upgrade: ${previousPackageName} → ${pkg.name} (paid difference: $${(amountToDeductCents / 100).toFixed(2)} USD)`
              : `Lifetime package subscription: ${pkg.name} ($${(pkg.priceCents / 100).toFixed(2)} USD)`,
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
      }

      // Mark previous active package as UPGRADED
      if (isUpgrade && activePurchase) {
        await tx.packagePurchase.update({
          where: { id: activePurchase.id },
          data: { status: 'UPGRADED' },
        });
      }

      const newPurchase = await tx.packagePurchase.create({
        data: {
          userId,
          packageId: pkg.id,
          packageName: pkg.name,
          priceCentsPaid: pkg.priceCents, // Record full tier value so future upgrades compute difference accurately
          currency: chosenCurrency,
          videoLimitGranted: pkg.videoLimit,
          status: 'ACTIVE',
          expiresAt: null, // Lifetime subscription
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

    await AccountLevelService.calculateAndUpdateUserLevel(userId).catch(() => {});

    await NotificationService.send({
      userId,
      eventKey: 'rewardCredited',
      title: isUpgrade ? `Upgraded to ${pkg.name} Plan!` : `${pkg.name} Lifetime Plan Activated`,
      message: isUpgrade
        ? `You upgraded from ${previousPackageName} to ${pkg.name} by paying only the $${(amountToDeductCents / 100).toFixed(2)} USD difference. Your higher-level ads are now unlocked!`
        : `Your ${pkg.name} lifetime subscription ($${(pkg.priceCents / 100).toFixed(2)} USD) is now active! Watch ads and keep earning.`,
      type: 'SUCCESS',
    });

    return { ...purchase, isUpgrade, amountChargedCents: amountToDeductCents };
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
