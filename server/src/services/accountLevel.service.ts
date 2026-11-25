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
    // Normalize any legacy LEVEL_0 users to NEW_USER
    await prisma.user.updateMany({
      where: { accountLevel: 'LEVEL_0' },
      data: { accountLevel: 'NEW_USER' },
    }).catch(() => {});
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
    const normalizedLevel = newLevel === 'LEVEL_0' ? 'NEW_USER' : newLevel;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found.');

    const oldLevel = user.accountLevel;
    return await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { accountLevel: normalizedLevel },
      });

      await tx.accountLevelHistory.create({
        data: {
          userId,
          oldLevel,
          newLevel: normalizedLevel,
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
          details: JSON.stringify({ oldLevel, newLevel: normalizedLevel, reason }),
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Account Level Adjusted by Administrator',
          message: `Your account level has been updated from ${oldLevel} to ${normalizedLevel}. Reason: ${reason}`,
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

      await tx.notification.create({
        data: {
          userId,
          title: 'Account Locked by Administrator',
          message: `Your account has been locked for ${durationDays} days (until ${lockedUntil.toLocaleDateString()}). Reason: ${reason}`,
          type: 'WARNING',
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

      await tx.notification.create({
        data: {
          userId,
          title: 'Account Unlocked',
          message: `Your account lock has been lifted by an administrator. Reason: ${reason}`,
          type: 'SUCCESS',
        },
      });

      return updated;
    });
  }

  static async getDailyBonusBatches() {
    const batches = await prisma.dailyBonusBatch.findMany({
      orderBy: { batchDate: 'desc' },
      take: 20,
    });
    const recentBonusTxs = await prisma.ledgerTransaction.findMany({
      where: { reference: { startsWith: 'DAILY-BONUS-' } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        entries: {
          where: { entryType: 'CREDIT' },
          include: {
            account: {
              include: {
                user: { select: { id: true, fullName: true, email: true, memberCode: true, accountLevel: true } },
              },
            },
          },
        },
      },
    });
    return {
      batches,
      recentPayouts: recentBonusTxs.map((t) => {
        const creditEntry = t.entries[0];
        const u = creditEntry?.account?.user;
        return {
          id: t.id,
          reference: t.reference,
          description: t.description,
          amountUSD: ((creditEntry?.amountCents || 0) / 100).toFixed(2),
          createdAt: t.createdAt,
          user: u || null,
        };
      }),
    };
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
      const history = await this.getDailyBonusBatches();
      return {
        message: 'Daily bonus batch for today has already executed.',
        batch: existing,
        payouts: history.recentPayouts.filter((p) => p.reference.endsWith(today)),
      };
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
    const payouts: Array<{
      userId: string;
      fullName: string;
      email: string;
      accountLevel: string;
      bonusCents: number;
      bonusUSD: string;
      reference: string;
    }> = [];

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

        await tx.notification.create({
          data: {
            userId: u.id,
            title: 'Daily Level Bonus Credited',
            message: `+$${(bonusCents / 100).toFixed(2)} USD daily bonus (${lvl.name}) credited to your Main Account for ${today}.`,
            type: 'SUCCESS',
          },
        });

        totalUsersPaid++;
        totalCentsPaid += bonusCents;
        payouts.push({
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          accountLevel: lvl.name,
          bonusCents,
          bonusUSD: (bonusCents / 100).toFixed(2),
          reference: ref,
        });
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
      payouts,
    };
  }

  /**
   * Authoritative Level Progress computed strictly from total qualifying volume
   * (approved USD deposits + active package purchases) — NEVER cash sitting in wallet (#6).
   */
  static async getUserLevelProgress(userId: string) {
    const [user, levels] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          packagePurchases: { where: { status: 'ACTIVE' } },
          depositRequests: { where: { status: 'APPROVED' } },
        },
      }),
      this.getAllLevels(),
    ]);

    if (!user) return null;

    let qualifyingVolumeCents = 0;
    for (const dep of user.depositRequests) {
      if (dep.currency === 'USD') qualifyingVolumeCents += dep.amountCents;
    }
    for (const pkg of user.packagePurchases) {
      if (pkg.currency === 'USD') qualifyingVolumeCents += pkg.priceCentsPaid;
    }

    const activeLevels = levels.filter((l) => l.isActive);
    const normalizedKey = !user.accountLevel || user.accountLevel === 'LEVEL_0' ? 'NEW_USER' : user.accountLevel;
    const currentIdx = Math.max(0, activeLevels.findIndex((l) => l.levelKey === normalizedKey));
    const currentLvl = activeLevels[currentIdx] || activeLevels[0];
    const nextLvl = activeLevels[currentIdx + 1] || null;

    const purchaseLimit = user.packagePurchases.reduce((m, p) => Math.max(m, p.videoLimitGranted || 0), 0);
    const effectiveVideoLimit = Math.max(currentLvl?.videoLimit ?? 0, purchaseLimit);

    if (!nextLvl) {
      return {
        currentLevel: currentLvl?.levelKey || 'LEVEL_5',
        currentLevelName: currentLvl?.name || 'Level 5',
        nextLevel: null,
        nextLevelName: null,
        qualifyingVolumeCents,
        currentLevelMinCents: currentLvl?.minQualificationUSD ?? 0,
        nextLevelMinCents: null,
        neededCents: 0,
        progressPercent: 100,
        videoLimit: effectiveVideoLimit,
        dailyBonusRateBps: currentLvl?.dailyBonusRateBps ?? 0,
      };
    }

    const floorCents = currentLvl?.minQualificationUSD ?? 0;
    const targetCents = nextLvl.minQualificationUSD;
    const span = Math.max(1, targetCents - floorCents);
    const gained = Math.max(0, qualifyingVolumeCents - floorCents);
    const neededCents = Math.max(0, targetCents - qualifyingVolumeCents);
    // Never show 100% while still needing more to reach next level
    const rawPct = Math.round((gained / span) * 100);
    const progressPercent = neededCents === 0 ? 100 : Math.min(99, Math.max(0, rawPct));

    return {
      currentLevel: currentLvl?.levelKey || 'NEW_USER',
      currentLevelName: currentLvl?.name || 'New User',
      nextLevel: nextLvl.levelKey,
      nextLevelName: nextLvl.name,
      qualifyingVolumeCents,
      currentLevelMinCents: floorCents,
      nextLevelMinCents: targetCents,
      neededCents,
      progressPercent,
      videoLimit: effectiveVideoLimit,
      dailyBonusRateBps: currentLvl?.dailyBonusRateBps ?? 0,
    };
  }

  /**
   * Configurable daily reward cycle window (default 8:00 AM -> next 8:00 AM).
   * Unclaimed rewards expire strictly at windowEnd with ZERO carry forward.
   */
  static async getDailyResetHour(): Promise<number> {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'DAILY_RESET_HOUR' } });
    if (setting && !isNaN(parseInt(setting.value, 10))) {
      const h = parseInt(setting.value, 10);
      if (h >= 0 && h <= 23) return h;
    }
    return 8; // Default 8:00 AM -> next 8:00 AM
  }

  static getDailyWindow(resetHour: number, now = new Date()) {
    const windowStart = new Date(now);
    windowStart.setHours(resetHour, 0, 0, 0);
    if (now < windowStart) {
      windowStart.setDate(windowStart.getDate() - 1);
    }
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowEnd.getDate() + 1);
    const y = windowStart.getFullYear();
    const m = String(windowStart.getMonth() + 1).padStart(2, '0');
    const d = String(windowStart.getDate()).padStart(2, '0');
    const cycleKey = `${y}-${m}-${d}-H${String(resetHour).padStart(2, '0')}`;
    return { cycleKey, windowStart, windowEnd, resetHour };
  }

  static async getUserDailyRewardStatus(userId: string) {
    const [resetHour, progress, user] = await Promise.all([
      this.getDailyResetHour(),
      this.getUserLevelProgress(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { status: true, accountLockedUntil: true } }),
    ]);

    const { cycleKey, windowStart, windowEnd } = this.getDailyWindow(resetHour);
    const videosRequired = progress?.videoLimit ?? 0;

    // Count distinct videos completed during THIS active daily window only (no carry forward!)
    const sessionsInWindow = await prisma.videoSession.findMany({
      where: {
        userId,
        completed: true,
        completedAt: { gte: windowStart, lt: windowEnd },
      },
      select: { videoId: true },
    });
    const completedIds = new Set(sessionsInWindow.map((s) => s.videoId));
    const videosCompletedToday = completedIds.size;

    const existingClaim = await prisma.dailyRewardClaim.findUnique({
      where: { userId_cycleKey: { userId, cycleKey } },
    });

    // Preserve existing AccountLevelConfig dailyBonusRateBps calculation
    const rateBps = progress?.dailyBonusRateBps ?? 0;
    const baseCents = Math.max(progress?.currentLevelMinCents ?? 0, progress?.qualifyingVolumeCents ?? 0);
    const estimatedRewardCents = rateBps > 0 ? Math.floor((baseCents * rateBps) / 10000) : 0;

    const isLocked = Boolean(user?.accountLockedUntil && user.accountLockedUntil > new Date());
    const eligibleToClaim =
      !isLocked &&
      user?.status === 'ACTIVE' &&
      videosRequired > 0 &&
      videosCompletedToday >= videosRequired &&
      estimatedRewardCents > 0 &&
      !existingClaim;

    return {
      cycleKey,
      resetHour,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      videosRequired,
      videosCompletedToday,
      dailyBonusRateBps: rateBps,
      estimatedRewardCents,
      alreadyClaimedToday: Boolean(existingClaim),
      claimedAmountCents: existingClaim?.amountCents ?? 0,
      eligibleToClaim,
      isAccountLocked: isLocked,
    };
  }

  static async claimDailyVideoReward(userId: string) {
    const status = await this.getUserDailyRewardStatus(userId);

    if (status.isAccountLocked) {
      throw { statusCode: 403, code: 'ACCOUNT_LOCKED', message: 'Your account is currently locked.' };
    }
    if (status.alreadyClaimedToday) {
      throw { statusCode: 400, code: 'ALREADY_CLAIMED_TODAY', message: 'You have already claimed your daily reward for this cycle.' };
    }
    if (status.videosRequired <= 0) {
      throw { statusCode: 400, code: 'UPGRADE_REQUIRED', message: 'Upgrade to Level 1 or higher to unlock daily video rewards.' };
    }
    if (status.videosCompletedToday < status.videosRequired) {
      throw {
        statusCode: 400,
        code: 'INCOMPLETE_DAILY_VIDEOS',
        message: `Complete all ${status.videosRequired} eligible videos before claiming (${status.videosCompletedToday}/${status.videosRequired} completed in this cycle).`,
      };
    }
    if (new Date() >= new Date(status.windowEnd)) {
      throw { statusCode: 400, code: 'WINDOW_EXPIRED', message: 'This daily reward window has expired. Unclaimed daily rewards do not carry forward.' };
    }
    if (status.estimatedRewardCents <= 0) {
      throw { statusCode: 400, code: 'NO_REWARD_CONFIGURED', message: 'No daily reward percentage is configured for your current level.' };
    }

    const amountCents = status.estimatedRewardCents;
    const claim = await prisma.$transaction(async (tx) => {
      const existing = await tx.dailyRewardClaim.findUnique({
        where: { userId_cycleKey: { userId, cycleKey: status.cycleKey } },
      });
      if (existing) {
        throw { statusCode: 400, code: 'ALREADY_CLAIMED_TODAY', message: 'Daily reward already claimed for this cycle.' };
      }

      const sysExpense = await LedgerService.getOrCreateAccount(tx, AccountType.SYSTEM_EXPENSE_REWARDS, Currency.USD, null);
      const userAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_VIDEO_REWARDS, Currency.USD, userId);

      const ref = `DAILY-VID-REW-${userId.slice(0, 8)}-${status.cycleKey}`;
      const ledgerTx = await LedgerService.postTransaction(
        {
          reference: ref,
          transactionType: LedgerTransactionType.REWARD_CREDIT,
          currency: Currency.USD,
          description: `Daily video completion reward (${status.videosCompletedToday}/${status.videosRequired} videos, cycle ${status.cycleKey})`,
          postedById: userId,
          entries: [
            { accountId: sysExpense.id, entryType: EntryType.DEBIT, amountCents },
            { accountId: userAccount.id, entryType: EntryType.CREDIT, amountCents },
          ],
        },
        tx
      );

      const created = await tx.dailyRewardClaim.create({
        data: {
          userId,
          cycleKey: status.cycleKey,
          amountCents,
          videosCompleted: status.videosCompletedToday,
          videosRequired: status.videosRequired,
          ledgerTxId: ledgerTx.id,
        },
      });

      await tx.notification.create({
        data: {
          userId,
          title: 'Daily Reward Claimed!',
          message: `+$${(amountCents / 100).toFixed(2)} USD daily reward credited to your Video Rewards wallet for completing ${status.videosCompletedToday}/${status.videosRequired} videos.`,
          type: 'SUCCESS',
        },
      });

      return created;
    });

    return claim;
  }
}

