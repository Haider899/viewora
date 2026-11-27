import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountLevelService } from './accountLevel.service.js';
import { DEFAULT_REFERRAL_CONFIG } from './bootstrap.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

export class ReferralService {
  static async getReferralConfig() {
    const row = await prisma.systemSetting.findUnique({ where: { key: 'REFERRAL_CONFIG' } });
    if (!row) return DEFAULT_REFERRAL_CONFIG;
    try {
      return { ...DEFAULT_REFERRAL_CONFIG, ...JSON.parse(row.value) };
    } catch {
      return DEFAULT_REFERRAL_CONFIG;
    }
  }

  static async updateReferralConfig(adminId: string, config: any) {
    const merged = { ...(await this.getReferralConfig()), ...config };
    await prisma.systemSetting.upsert({
      where: { key: 'REFERRAL_CONFIG' },
      update: { value: JSON.stringify(merged), updatedAt: new Date() },
      create: {
        key: 'REFERRAL_CONFIG',
        value: JSON.stringify(merged),
        description: 'Configurable referral rank ranges, position commission rates, milestones, and minimum qualifying transaction USD',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_REFERRAL_CONFIG',
        resourceType: 'SystemSetting',
        resourceId: 'REFERRAL_CONFIG',
        details: JSON.stringify(merged),
      },
    });

    return merged;
  }

  static resolvePositionRate(position: number, config: any): number {
    const rates = config?.commissionRates || DEFAULT_REFERRAL_CONFIG.commissionRates;
    if (position <= 1) return Number(rates.pos1 ?? 5);
    if (position === 2) return Number(rates.pos2 ?? 7);
    if (position === 3) return Number(rates.pos3 ?? 10);
    if (position === 4) return Number(rates.pos4 ?? 12);
    if (position === 5) return Number(rates.pos5 ?? 15);
    if (position <= 10) return Number(rates.range6to10 ?? 15);
    if (position <= 100) return Number(rates.range11to100 ?? 15);
    if (position <= 500) return Number(rates.range101to500 ?? 15);
    return Number(rates.range501Plus ?? 15);
  }

  /**
   * Part 3 & Part 4: Qualifies referral on first qualifying package purchase, evaluates rank milestones,
   * and (if `firstTransactionEnabled` is ON) pays the one-time First-Transaction Commission using the
   * EXACT same chronological position rate table as Daily Commissions (never swapped, never wrong %).
   */
  static async markReferralQualifiedOnPurchase(
    sourceUserId: string,
    netRevenueCents: number,
    tx: Prisma.TransactionClient,
    revenueEventId?: string
  ) {
    const config = await this.getReferralConfig();
    const minQualifyingCents = Math.round((config.minQualifyingUSD || 20) * 100);
    if (netRevenueCents < minQualifyingCents) {
      return null;
    }

    const sourceUser = await tx.user.findUnique({
      where: { id: sourceUserId },
      include: { referredBy: true },
    });

    if (!sourceUser || !sourceUser.referredById || !sourceUser.referredBy) {
      return null;
    }

    const beneficiary = sourceUser.referredBy;
    if (beneficiary.id === sourceUserId) {
      return null;
    }

    const newlyQualified = !sourceUser.isQualifiedReferral;
    if (newlyQualified) {
      await tx.user.update({
        where: { id: sourceUserId },
        data: { isQualifiedReferral: true },
      });
    }

    // Check global referral bonus toggle + independent firstTransactionEnabled toggle (Part 3)
    let globalRefEnabled = env.ENABLE_REFERRAL_COMMISSIONS;
    const bonusSetting = await tx.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } });
    if (bonusSetting) {
      try {
        const parsed = JSON.parse(bonusSetting.value);
        if (parsed?.referralBonus?.enabled === false) globalRefEnabled = false;
      } catch {}
    }

    const firstTxEnabled = config.firstTransactionEnabled !== false;
    let firstTxCommission: any = null;

    if (globalRefEnabled && firstTxEnabled) {
      // Strictly one-time per referred user
      const priorFirstTx = await tx.referralCommission.count({
        where: {
          sourceUserId,
          commissionType: { in: ['FIRST_TRANSACTION', 'PACKAGE_PURCHASE'] },
        },
      });

      if (priorFirstTx === 0) {
        // Part 4: Exact same chronological position ordering as Daily Commission!
        const allQualifiedRefs = await tx.user.findMany({
          where: {
            referredById: beneficiary.id,
            OR: [{ isQualifiedReferral: true }, { packagePurchases: { some: { status: 'ACTIVE' } } }],
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true },
        });
        const idx = allQualifiedRefs.findIndex((r) => r.id === sourceUserId);
        const position = idx >= 0 ? idx + 1 : allQualifiedRefs.length + 1;

        const maxLimit = Number(config.maxCommissionReferrals ?? 0);
        if (maxLimit <= 0 || position <= maxLimit) {
          const ratePercent = this.resolvePositionRate(position, config);
          const commissionCents = Math.round((netRevenueCents * ratePercent) / 100);
          if (commissionCents > 0) {
            const beneficiaryAccount = await LedgerService.getOrCreateAccount(
              tx,
              AccountType.USER_REFERRAL,
              Currency.USD,
              beneficiary.id
            );
            const sysExpenseAccount = await LedgerService.getOrCreateAccount(
              tx,
              AccountType.SYSTEM_EXPENSE_REFERRALS,
              Currency.USD,
              null
            );
            const ref = `REF-FIRST-${beneficiary.id.slice(0, 6)}-${sourceUserId.slice(0, 6)}-${Date.now()}`;
            const ledgerTx = await LedgerService.postTransaction(
              {
                reference: ref,
                transactionType: LedgerTransactionType.REFERRAL_COMMISSION,
                currency: Currency.USD,
                description: `Position #${position} First-Transaction Commission (${ratePercent}%) on ${sourceUser.fullName}'s qualifying package`,
                entries: [
                  { accountId: sysExpenseAccount.id, entryType: EntryType.DEBIT, amountCents: commissionCents },
                  { accountId: beneficiaryAccount.id, entryType: EntryType.CREDIT, amountCents: commissionCents },
                ],
              },
              tx
            );
            firstTxCommission = await tx.referralCommission.create({
              data: {
                beneficiaryId: beneficiary.id,
                sourceUserId,
                revenueEventId: revenueEventId || null,
                commissionType: 'FIRST_TRANSACTION',
                cycleKey: null,
                sourceEarningsCents: netRevenueCents,
                positionNumber: position,
                commissionCents,
                currency: 'USD',
                ratePercent,
                status: 'CREDITED',
                ledgerTxId: ledgerTx.id,
              },
            });
            await tx.notification.create({
              data: {
                userId: beneficiary.id,
                title: 'Referral Qualified & Commission Credited',
                message: `${sourceUser.fullName} activated a qualifying package! +$${(commissionCents / 100).toFixed(2)} USD (${ratePercent}% — Position #${position}) credited to your Referral Earnings.`,
                type: 'SUCCESS',
              },
            });
          }
        }
      }
    } else if (newlyQualified) {
      await tx.notification.create({
        data: {
          userId: beneficiary.id,
          title: 'Referral Qualified',
          message: `${sourceUser.fullName} activated a qualifying package and joined your qualified network!`,
          type: 'SUCCESS',
        },
      });
    }

    await this.checkAndAwardMilestones(beneficiary.id, Currency.USD, tx, config);
    return { qualified: true, beneficiaryId: beneficiary.id, commission: firstTxCommission };
  }

  /**
   * Part 4 #1 & #2: Daily 24-hour Referral Commission Settlement.
   * Computes each sponsor's commission on what their qualified referrals ACTUALLY earned from ads
   * during the given 24-hour cycle (defaults to the most recently completed 8 PM PKT cycle).
   * - Respects exact position rates (5% / 7% / 10% / 12% / 15%) and maxCommissionReferrals cap.
   * - Referrals with 0 ad earnings in that cycle earn their sponsor $0.
   * - Strictly idempotent per (beneficiaryId, sourceUserId, cycleKey) — never double-credits!
   */
  static async settleDailyReferralCommissions(options?: {
    cycleKey?: string;
    windowStart?: Date;
    windowEnd?: Date;
    executedById?: string;
    useCurrentCycle?: boolean;
  }) {
    if (!env.ENABLE_REFERRAL_COMMISSIONS) {
      return { settledCount: 0, totalCommissionCents: 0, cycleKey: null, skipped: 'DISABLED' };
    }

    const bonusSetting = await prisma.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } });
    if (bonusSetting) {
      try {
        const parsed = JSON.parse(bonusSetting.value);
        if (parsed?.referralBonus?.enabled === false) {
          return { settledCount: 0, totalCommissionCents: 0, cycleKey: null, skipped: 'PAUSED' };
        }
      } catch {}
    }

    const resetHour = await AccountLevelService.getDailyResetHour();
    const now = new Date();
    const refDate = options?.useCurrentCycle ? now : new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const defaultWin = AccountLevelService.getDailyWindow(resetHour, refDate);
    const cycleKey = options?.cycleKey || defaultWin.cycleKey;
    const windowStart = options?.windowStart || defaultWin.windowStart;
    const windowEnd = options?.windowEnd || defaultWin.windowEnd;
    const executedById = options?.executedById || 'SYSTEM';

    const config = await this.getReferralConfig();
    // Part 3: Independent switch for Daily 24h Referral Commission
    if (config.dailyCommissionEnabled === false) {
      return { settledCount: 0, totalCommissionCents: 0, cycleKey: null, skipped: 'DAILY_DISABLED' };
    }
    const maxLimit = Number(config.maxCommissionReferrals ?? 0);

    // Gather all ad reward claims inside this 24-hour cycle
    const claims = await prisma.rewardClaim.findMany({
      where: {
        OR: [
          { cycleKey },
          { claimedAt: { gte: windowStart, lt: windowEnd } },
        ],
      },
      select: { userId: true, amountCents: true },
    });

    const earningsByUser = new Map<string, number>();
    for (const c of claims) {
      earningsByUser.set(c.userId, (earningsByUser.get(c.userId) || 0) + c.amountCents);
    }

    if (earningsByUser.size === 0) {
      return { settledCount: 0, totalCommissionCents: 0, cycleKey };
    }

    const activeReferralIds = Array.from(earningsByUser.keys());
    const referredEarners = await prisma.user.findMany({
      where: {
        id: { in: activeReferralIds },
        referredById: { not: null },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        fullName: true,
        referredById: true,
        isQualifiedReferral: true,
        packagePurchases: { where: { status: 'ACTIVE' }, select: { id: true } },
      },
    });

    // Group by sponsor so we compute accurate chronological referral positions
    const sponsorIds = Array.from(
      new Set(
        referredEarners
          .filter((u) => u.referredById && u.referredById !== u.id && (u.isQualifiedReferral || u.packagePurchases.length > 0))
          .map((u) => u.referredById!)
      )
    );

    let settledCount = 0;
    let totalCommissionCents = 0;

    for (const sponsorId of sponsorIds) {
      // Determine stable chronological positions of ALL qualified referrals for this sponsor
      const allSponsorRefs = await prisma.user.findMany({
        where: {
          referredById: sponsorId,
          OR: [{ isQualifiedReferral: true }, { packagePurchases: { some: { status: 'ACTIVE' } } }],
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, fullName: true },
      });

      const posMap = new Map<string, number>();
      allSponsorRefs.forEach((r, idx) => posMap.set(r.id, idx + 1));

      const sponsorEarners = referredEarners.filter(
        (u) => u.referredById === sponsorId && posMap.has(u.id)
      );

      for (const refUser of sponsorEarners) {
        const position = posMap.get(refUser.id) || 1;
        if (maxLimit > 0 && position > maxLimit) {
          continue;
        }

        const sourceEarningsCents = earningsByUser.get(refUser.id) || 0;
        if (sourceEarningsCents <= 0) continue;

        const ratePercent = this.resolvePositionRate(position, config);
        const commissionCents = Math.max(1, Math.round((sourceEarningsCents * ratePercent) / 100));
        if (commissionCents <= 0) continue;

        // Idempotency check: never double-pay for the same (sponsor, referral, cycleKey)
        const existing = await prisma.referralCommission.findFirst({
          where: {
            beneficiaryId: sponsorId,
            sourceUserId: refUser.id,
            cycleKey,
          },
        });
        if (existing) continue;

        await prisma.$transaction(async (tx) => {
          const beneficiaryAccount = await LedgerService.getOrCreateAccount(
            tx,
            AccountType.USER_REFERRAL,
            Currency.USD,
            sponsorId
          );
          const sysExpenseAccount = await LedgerService.getOrCreateAccount(
            tx,
            AccountType.SYSTEM_EXPENSE_REFERRALS,
            Currency.USD,
            null
          );

          const ref = `REF-DAILY-${sponsorId.slice(0, 6)}-${refUser.id.slice(0, 6)}-${cycleKey}`;
          const ledgerTx = await LedgerService.postTransaction(
            {
              reference: ref,
              transactionType: LedgerTransactionType.REFERRAL_COMMISSION,
              currency: Currency.USD,
              description: `Daily Referral Commission (#${position}, ${ratePercent}%) on ${refUser.fullName}'s $${(sourceEarningsCents / 100).toFixed(2)} daily ad earnings (${cycleKey})`,
              postedById: executedById,
              entries: [
                {
                  accountId: sysExpenseAccount.id,
                  entryType: EntryType.DEBIT,
                  amountCents: commissionCents,
                },
                {
                  accountId: beneficiaryAccount.id,
                  entryType: EntryType.CREDIT,
                  amountCents: commissionCents,
                },
              ],
            },
            tx
          );

          await tx.referralCommission.create({
            data: {
              beneficiaryId: sponsorId,
              sourceUserId: refUser.id,
              revenueEventId: null,
              commissionType: 'DAILY_AD_EARNINGS',
              cycleKey,
              sourceEarningsCents,
              positionNumber: position,
              commissionCents,
              currency: 'USD',
              ratePercent,
              status: 'CREDITED',
              ledgerTxId: ledgerTx.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: sponsorId,
              title: 'Daily Referral Commission Credited',
              message: `+$${(commissionCents / 100).toFixed(2)} USD (${ratePercent}% on ${refUser.fullName}'s $${(sourceEarningsCents / 100).toFixed(2)} ad earnings) credited to your Referral Earnings.`,
              type: 'SUCCESS',
            },
          });
        });

        settledCount++;
        totalCommissionCents += commissionCents;
      }
    }

    return { settledCount, totalCommissionCents, cycleKey };
  }

  /**
   * Legacy helper kept for backwards compatibility if called directly.
   */
  static async processCommissionForRevenueEvent(
    sourceUserId: string,
    _revenueEventId: string,
    netRevenueCents: number,
    _currency: Currency,
    tx: Prisma.TransactionClient
  ) {
    return this.markReferralQualifiedOnPurchase(sourceUserId, netRevenueCents, tx);
  }

  /**
   * Awards one-time milestone rewards dynamically based on REFERRAL_CONFIG
   */
  static async checkAndAwardMilestones(
    beneficiaryId: string,
    currency: Currency,
    tx: Prisma.TransactionClient,
    passedConfig?: any
  ) {
    const config = passedConfig || (await this.getReferralConfig());
    const qualifiedCount = await tx.user.count({
      where: { referredById: beneficiaryId, isQualifiedReferral: true },
    });

    const ranks = config.ranks || DEFAULT_REFERRAL_CONFIG.ranks;
    for (const r of ranks) {
      if (!r.milestoneAt || r.milestoneAt <= 0 || !r.milestoneRewardUSD || r.milestoneRewardUSD <= 0) {
        continue;
      }

      if (qualifiedCount >= r.milestoneAt) {
        const existingClaim = await tx.referralMilestoneClaim.findUnique({
          where: {
            userId_rankName: {
              userId: beneficiaryId,
              rankName: r.key,
            },
          },
        });

        if (!existingClaim) {
          const rewardCents = Math.round(r.milestoneRewardUSD * 100);
          const beneficiaryAccount = await LedgerService.getOrCreateAccount(
            tx,
            AccountType.USER_REFERRAL,
            Currency.USD,
            beneficiaryId
          );

          const sysExpenseAccount = await LedgerService.getOrCreateAccount(
            tx,
            AccountType.SYSTEM_EXPENSE_REFERRALS,
            Currency.USD,
            null
          );

          const ref = `MILESTONE-${r.key}-${beneficiaryId.slice(0, 8)}-${Date.now()}`;
          const ledgerTx = await LedgerService.postTransaction(
            {
              reference: ref,
              transactionType: LedgerTransactionType.MILESTONE_REWARD,
              currency: Currency.USD,
              description: `${r.name} Milestone Reward (${r.milestoneAt} Qualified Referrals)`,
              entries: [
                {
                  accountId: sysExpenseAccount.id,
                  entryType: EntryType.DEBIT,
                  amountCents: rewardCents,
                },
                {
                  accountId: beneficiaryAccount.id,
                  entryType: EntryType.CREDIT,
                  amountCents: rewardCents,
                },
              ],
            },
            tx
          );

          await tx.referralMilestoneClaim.create({
            data: {
              userId: beneficiaryId,
              rankName: r.key,
              qualifiedCount: r.milestoneAt,
              rewardAmountCents: rewardCents,
              currency: 'USD',
              ledgerTxId: ledgerTx.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: beneficiaryId,
              title: `🎉 ${r.name} Rank & Milestone Reward Unlocked!`,
              message: `Congratulations! You reached ${r.name} (${qualifiedCount} qualified referrals) and earned a one-time +$${r.milestoneRewardUSD.toFixed(2)} USD bonus in your Referral Wallet.`,
              type: 'SUCCESS',
            },
          });
        }
      }
    }
  }

  static async transferReferralToMainBalance(userId: string, amountCents: number) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('Transfer amount must be a positive integer in cents.');
    }

    const res = await prisma.$transaction(async (tx) => {
      const referralAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_REFERRAL,
        Currency.USD,
        userId
      );

      if (referralAccount.balanceCents < amountCents) {
        throw new Error(
          `Insufficient referral funds. Available: $${(referralAccount.balanceCents / 100).toFixed(2)}, Requested: $${(amountCents / 100).toFixed(2)}`
        );
      }

      const availableAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
        Currency.USD,
        userId
      );

      const ref = `REF-CONV-${userId.slice(0, 8)}-${Date.now()}`;

      const ledgerTx = await LedgerService.postTransaction(
        {
          reference: ref,
          transactionType: LedgerTransactionType.REFERRAL_CONVERT,
          currency: Currency.USD,
          description: `Transferred $${(amountCents / 100).toFixed(2)} USD from Referral Wallet into Main Account`,
          postedById: userId,
          entries: [
            {
              accountId: referralAccount.id,
              entryType: EntryType.DEBIT,
              amountCents,
            },
            {
              accountId: availableAccount.id,
              entryType: EntryType.CREDIT,
              amountCents,
            },
          ],
        },
        tx
      );

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REFERRAL_WALLET_CONVERSION',
          resourceType: 'WalletTransfer',
          resourceId: ledgerTx.id,
          details: JSON.stringify({
            amountCents,
            reference: ref,
            source: 'USER_REFERRAL',
            destination: 'USER_AVAILABLE',
          }),
        },
      });

      return {
        success: true,
        transferredCents: amountCents,
        newReferralBalanceCents: referralAccount.balanceCents - amountCents,
        newAvailableBalanceCents: availableAccount.balanceCents + amountCents,
        reference: ref,
      };
    });

    await NotificationService.send({
      userId,
      eventKey: 'rewardCredited',
      title: 'Referral Balance Transferred',
      message: `Successfully transferred $${(amountCents / 100).toFixed(2)} USD from your Referral Wallet into your Main Account.`,
      type: 'SUCCESS',
    });

    return res;
  }

  static async getReferralRankAndProgress(userId: string) {
    const config = await this.getReferralConfig();
    const totalReferrals = await prisma.user.count({
      where: { referredById: userId },
    });

    // Part 11: Exact same qualification rule as getUserReferralSummary so counters ALWAYS agree 100%!
    const qualifiedReferrals = await prisma.user.count({
      where: {
        referredById: userId,
        OR: [{ isQualifiedReferral: true }, { packagePurchases: { some: { status: 'ACTIVE' } } }],
      },
    });

    // Part 5 (c): Strictly follow the rank & milestone table configured in Admin Panel (sorted by minQualified)
    const ranks: Array<any> = [...(config.ranks || DEFAULT_REFERRAL_CONFIG.ranks)].sort(
      (a, b) => Number(a.minQualified ?? 0) - Number(b.minQualified ?? 0)
    );
    let currentRankObj = ranks[0];
    for (const r of ranks) {
      if (qualifiedReferrals >= Number(r.minQualified ?? 0)) {
        currentRankObj = r;
      }
    }

    const nextRankObj = ranks.find((r) => Number(r.minQualified ?? 0) > qualifiedReferrals) || null;
    const targetRank =
      ranks.find((r) => Number(r.milestoneAt ?? 0) > 0 && qualifiedReferrals < Number(r.milestoneAt ?? 0)) ||
      nextRankObj ||
      ranks[ranks.length - 1];
    const targetQualified = Number(targetRank?.milestoneAt || targetRank?.minQualified || currentRankObj?.maxQualified || 10000);
    const nextRewardUSD =
      targetRank && qualifiedReferrals < Number(targetRank.milestoneAt ?? 0)
        ? Number(targetRank.milestoneRewardUSD ?? 0)
        : 0;

    const milestoneClaims = await prisma.referralMilestoneClaim.findMany({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    return {
      currentRank: currentRankObj?.name || 'New',
      nextRank: targetRank && targetRank.key !== currentRankObj?.key ? targetRank.name : null,
      totalReferrals,
      qualifiedReferrals,
      targetQualified,
      remainingToNext: Math.max(0, targetQualified - qualifiedReferrals),
      nextRewardUSD,
      milestoneClaims,
      config: { ...config, ranks },
    };
  }

  static async getUserReferralSummary(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        referralCode: true,
        referrals: {
          select: {
            id: true,
            fullName: true,
            email: true,
            status: true,
            isQualifiedReferral: true,
            createdAt: true,
            packagePurchases: {
              where: { status: 'ACTIVE' },
              select: { id: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        referralCommissions: {
          include: {
            sourceUser: { select: { fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'User not found.' };
    }

    const totalReferrals = user.referrals.length;
    const qualifiedReferrals = user.referrals.filter((r) => r.isQualifiedReferral || r.packagePurchases.length > 0).length;

    let totalCommissionCents = 0;
    for (const c of user.referralCommissions) {
      totalCommissionCents += c.commissionCents;
    }

    const rankProgress = await this.getReferralRankAndProgress(userId);
    const resetHour = await AccountLevelService.getDailyResetHour();
    const cycle = AccountLevelService.getDailyWindow(resetHour);

    // Stable chronological position numbers for ALL qualified referrals (1, 2, 3, 4, 5...)
    const qualifiedAsc = [...user.referrals]
      .filter((r) => r.isQualifiedReferral || r.packagePurchases.length > 0)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const positionBySourceUserId = new Map<string, number>();
    qualifiedAsc.forEach((r, idx) => {
      positionBySourceUserId.set(r.id, idx + 1);
    });

    // Compute live preview of today's accruing daily referral commissions (settled every 24h)
    const qualifiedIds = qualifiedAsc.map((r) => r.id);
    const todayClaims = qualifiedIds.length
      ? await prisma.rewardClaim.findMany({
          where: {
            userId: { in: qualifiedIds },
            OR: [
              { cycleKey: cycle.cycleKey },
              { claimedAt: { gte: cycle.windowStart, lt: cycle.windowEnd } },
            ],
          },
          select: { userId: true, amountCents: true },
        })
      : [];
    const todayEarnedByRef = new Map<string, number>();
    for (const cl of todayClaims) {
      todayEarnedByRef.set(cl.userId, (todayEarnedByRef.get(cl.userId) || 0) + cl.amountCents);
    }

    const maxLimit = Number(rankProgress.config?.maxCommissionReferrals ?? 0);
    let todayPendingCommissionCents = 0;
    for (const r of qualifiedAsc) {
      const pos = positionBySourceUserId.get(r.id) || 1;
      if (maxLimit > 0 && pos > maxLimit) continue;
      const earned = todayEarnedByRef.get(r.id) || 0;
      if (earned <= 0) continue;
      const rate = this.resolvePositionRate(pos, rankProgress.config);
      todayPendingCommissionCents += Math.max(1, Math.round((earned * rate) / 100));
    }

    // Sort referrals: qualified first by their true qualification position, then pending by join date
    const enrichedReferrals = user.referrals.map((r) => {
      const isQualified = r.isQualifiedReferral || r.packagePurchases.length > 0;
      const positionNumber = positionBySourceUserId.get(r.id) ?? null;
      return {
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        status: r.status,
        isQualified,
        positionNumber,
        todayAdEarningsCents: todayEarnedByRef.get(r.id) || 0,
        createdAt: r.createdAt.toISOString(),
        hasActivePackage: r.packagePurchases.length > 0,
      };
    });
    enrichedReferrals.sort((a, b) => {
      if (a.positionNumber !== null && b.positionNumber !== null) return a.positionNumber - b.positionNumber;
      if (a.positionNumber !== null) return -1;
      if (b.positionNumber !== null) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return {
      referralCode: user.referralCode,
      referralLink: `${env.CORS_ORIGIN === '*' ? 'https://u-ads.com' : env.CORS_ORIGIN}/signup?ref=${user.referralCode}`,
      totalReferrals,
      qualifiedReferrals,
      totalCommissionCents,
      dailyCommissionMode: true,
      todayPendingCommissionCents,
      nextSettlementAt: cycle.windowEnd.toISOString(),
      currency: 'USD',
      rankProgress,
      referralConfig: rankProgress.config,
      referrals: enrichedReferrals,
      commissions: user.referralCommissions.map((c) => ({
        id: c.id,
        sourceUserId: c.sourceUserId,
        sourceUserName: c.sourceUser.fullName,
        positionNumber: (c as any).positionNumber ?? positionBySourceUserId.get(c.sourceUserId) ?? null,
        commissionType: (c as any).commissionType || 'DAILY_AD_EARNINGS',
        cycleKey: (c as any).cycleKey || null,
        sourceEarningsCents: (c as any).sourceEarningsCents ?? null,
        commissionCents: c.commissionCents,
        currency: 'USD',
        ratePercent: c.ratePercent,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
}
