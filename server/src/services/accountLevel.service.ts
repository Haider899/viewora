import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

export const DEFAULT_ACCOUNT_LEVELS = [
  {
    levelKey: 'NEW_USER',
    name: 'New User',
    minQualificationUSD: 0,
    maxQualificationUSD: 1999, // < $20
    videoLimit: 0,
    dailyBonusRateBps: 0,
    badge: 'New',
  },
  {
    levelKey: 'LEVEL_1',
    name: 'Level 1',
    minQualificationUSD: 2000, // $20.00 (configurable by Admin)
    maxQualificationUSD: 9999, // $99.99
    videoLimit: 2,
    dailyBonusRateBps: 20, // 0.20% daily bonus rate
    badge: 'Level 1',
  },
  {
    levelKey: 'LEVEL_2',
    name: 'Level 2',
    minQualificationUSD: 10000, // $100.00
    maxQualificationUSD: 49900, // $499.00
    videoLimit: 6,
    dailyBonusRateBps: 30, // 0.30%
    badge: 'Level 2',
  },
  {
    levelKey: 'LEVEL_3',
    name: 'Level 3',
    minQualificationUSD: 50000, // $500.00
    maxQualificationUSD: 199900, // $1,999.00
    videoLimit: 15,
    dailyBonusRateBps: 40, // 0.40%
    badge: 'Level 3',
  },
  {
    levelKey: 'LEVEL_4',
    name: 'Level 4',
    minQualificationUSD: 200000, // $2,000.00
    maxQualificationUSD: 499900, // $4,999.00
    videoLimit: 30,
    dailyBonusRateBps: 50, // 0.50%
    badge: 'Level 4',
  },
  {
    levelKey: 'LEVEL_5',
    name: 'Level 5',
    minQualificationUSD: 500000, // $5,000.00
    maxQualificationUSD: 5000000, // $50,000.00
    videoLimit: 60,
    dailyBonusRateBps: 60, // 0.60%
    badge: 'Level 5',
  },
];

export class AccountLevelService {
  /**
   * Initializes default account levels if not existing
   */
  static async ensureDefaultLevels() {
    for (const lvl of DEFAULT_ACCOUNT_LEVELS) {
      await prisma.accountLevelConfig.upsert({
        where: { levelKey: lvl.levelKey },
        update: {},
        create: lvl,
      });
    }
  }

  /**
   * Retrieves all account level configurations
   */
  static async getAllLevels() {
    await this.ensureDefaultLevels();
    return await prisma.accountLevelConfig.findMany({
      orderBy: { minQualificationUSD: 'asc' },
    });
  }

  /**
   * Admin updates an account level configuration (Section 3.2)
   */
  static async updateLevel(levelKey: string, data: {
    name?: string;
    minQualificationUSD?: number;
    maxQualificationUSD?: number;
    videoLimit?: number;
    dailyBonusRateBps?: number;
    badge?: string;
    isActive?: boolean;
  }) {
    return await prisma.accountLevelConfig.update({
      where: { levelKey },
      data,
    });
  }

  /**
   * Evaluates and updates user account level based on qualifying activity
   */
  static async calculateAndUpdateUserLevel(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        packagePurchases: { where: { status: 'ACTIVE' } },
        depositRequests: { where: { status: 'APPROVED' } },
      },
    });

    if (!user) return null;

    // Calculate qualifying volume: verified deposits + active package purchases
    let qualifyingCents = 0;
    for (const dep of user.depositRequests) {
      if (dep.currency === 'USD') qualifyingCents += dep.amountCents;
    }
    for (const pkg of user.packagePurchases) {
      if (pkg.currency === 'USD') qualifyingCents += pkg.priceCentsPaid;
    }

    const levels = await this.getAllLevels();
    let eligibleLevel = 'NEW_USER';

    for (const lvl of levels) {
      if (!lvl.isActive) continue;
      if (qualifyingCents >= lvl.minQualificationUSD) {
        eligibleLevel = lvl.levelKey;
      }
    }

    if (user.accountLevel !== eligibleLevel) {
      const oldLevel = user.accountLevel;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { accountLevel: eligibleLevel },
        }),
        prisma.accountLevelHistory.create({
          data: {
            userId,
            oldLevel,
            newLevel: eligibleLevel,
            reason: `Automatic qualification update ($${(qualifyingCents / 100).toFixed(2)} qualifying activity)`,
            adjustedById: 'SYSTEM',
          },
        }),
        prisma.notification.create({
          data: {
            userId,
            title: '⭐ Account Level Upgraded!',
            message: `Congratulations! Your account level has been updated to ${eligibleLevel}.`,
            type: 'SUCCESS',
          },
        }),
      ]);
    }

    return eligibleLevel;
  }

  /**
   * Admin manually adjusts a user's account level (Section 3.2)
   */
  static async manualAdjustUserLevel(
    userId: string,
    newLevel: string,
    reason: string,
    adminId: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const oldLevel = user.accountLevel;
    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { accountLevel: newLevel },
      });

      await tx.accountLevelHistory.create({
        data: {
          userId,
          oldLevel,
          newLevel,
          reason,
          adjustedById: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'MANUAL_LEVEL_ADJUSTMENT',
          resourceType: 'User',
          resourceId: userId,
          details: JSON.stringify({ oldLevel, newLevel, reason }),
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Account Level Adjusted by Administrator',
          message: `Your account level has been updated from ${oldLevel} to ${newLevel}. Reason: ${reason}`,
          type: 'INFO',
        },
      });

      return updatedUser;
    });
  }

  /**
   * Account Lock / Unlock Presets (Section 11): 60 Days, 100 Days, 360 Days
   */
  static async lockUserAccount(
    userId: string,
    durationDays: number,
    reason: string,
    adminId: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const lockedUntil = new Date();
    lockedUntil.setDate(lockedUntil.getDate() + durationDays);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { accountLockedUntil: lockedUntil },
      });

      await tx.accountLockHistory.create({
        data: {
          userId,
          action: 'LOCKED',
          durationDays,
          lockedUntil,
          reason,
          performedById: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ACCOUNT_LOCKED',
          resourceType: 'User',
          resourceId: userId,
          details: JSON.stringify({ durationDays, lockedUntil, reason }),
        },
      });

      return updated;
    });
  }

  static async unlockUserAccount(
    userId: string,
    reason: string,
    adminId: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { accountLockedUntil: null },
      });

      await tx.accountLockHistory.create({
        data: {
          userId,
          action: 'UNLOCKED',
          reason,
          performedById: adminId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ACCOUNT_UNLOCKED',
          resourceType: 'User',
          resourceId: userId,
          details: JSON.stringify({ reason }),
        },
      });

      return updated;
    });
  }

  /**
   * Section 5.1: Daily Account Level Bonus Processing Batch
   */
  static async processDailyLevelBonuses(executedById = 'SYSTEM') {
    const today = new Date().toISOString().split('T')[0];

    // Check if today's batch already completed
    const existing = await prisma.dailyBonusBatch.findUnique({
      where: { batchDate: today },
    });
    if (existing && existing.status === 'COMPLETED') {
      return { message: 'Daily bonus batch for today has already executed.', batch: existing };
    }

    const levels = await this.getAllLevels();
    const levelMap = new Map(levels.map((l) => [l.levelKey, l]));

    // Find active non-locked users
    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
        status: 'ACTIVE',
        OR: [
          { accountLockedUntil: null },
          { accountLockedUntil: { lte: new Date() } },
        ],
      },
    });

    let totalUsersPaid = 0;
    let totalCentsPaid = 0;

    await prisma.$transaction(async (tx) => {
      const sysExpense = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_EXPENSE_REWARDS,
        Currency.USD,
        null
      );

      for (const u of users) {
        const lvl = levelMap.get(u.accountLevel);
        if (!lvl || lvl.dailyBonusRateBps <= 0) continue;

        // Reward calculation based on minimum qualification value and daily basis points
        const bonusCents = Math.floor((lvl.minQualificationUSD * lvl.dailyBonusRateBps) / 10000);
        if (bonusCents <= 0) continue;

        const userAccount = await LedgerService.getOrCreateAccount(
          tx,
          AccountType.USER_AVAILABLE,
          Currency.USD,
          u.id
        );

        const ref = `DAILY-BONUS-${u.id.slice(0, 8)}-${today}`;
        await LedgerService.postTransaction(
          {
            reference: ref,
            transactionType: LedgerTransactionType.REWARD_CREDIT,
            currency: Currency.USD,
            description: `Daily level bonus (${lvl.name}) for ${today}`,
            postedById: executedById,
            entries: [
              {
                accountId: sysExpense.id,
                entryType: EntryType.DEBIT,
                amountCents: bonusCents,
              },
              {
                accountId: userAccount.id,
                entryType: EntryType.CREDIT,
                amountCents: bonusCents,
              },
            ],
          },
          tx
        );

        totalUsersPaid++;
        totalCentsPaid += bonusCents;
      }

      await tx.dailyBonusBatch.upsert({
        where: { batchDate: today },
        update: {
          totalUsersPaid,
          totalAmountCents: totalCentsPaid,
          status: 'COMPLETED',
          executedById,
        },
        create: {
          batchDate: today,
          totalUsersPaid,
          totalAmountCents: totalCentsPaid,
          currency: 'USD',
          status: 'COMPLETED',
          executedById,
          notes: `Batch completed with ${totalUsersPaid} users credited.`,
        },
      });
    });

    return {
      success: true,
      batchDate: today,
      totalUsersPaid,
      totalAmountUSD: (totalCentsPaid / 100).toFixed(2),
    };
  }
}

