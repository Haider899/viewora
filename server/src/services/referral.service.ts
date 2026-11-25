import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
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

  /**
   * Processes referral commission ONLY on the referred user's FIRST qualifying transaction.
   * Uses dynamic rates and minimum qualifying USD from REFERRAL_CONFIG.
   */
  static async processCommissionForRevenueEvent(
    sourceUserId: string,
    revenueEventId: string,
    netRevenueCents: number,
    currency: Currency,
    tx: Prisma.TransactionClient
  ) {
    if (!env.ENABLE_REFERRAL_COMMISSIONS) {
      return null;
    }

    const bonusSetting = await tx.systemSetting.findUnique({ where: { key: 'BONUS_SETTINGS' } });
    if (bonusSetting) {
      try {
        const parsed = JSON.parse(bonusSetting.value);
        if (parsed?.referralBonus?.enabled === false) {
          return null;
        }
      } catch {}
    }

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
      console.warn(`[Referral Anti-Fraud] Blocked self-referral for user ${sourceUserId}`);
      return null;
    }

    // Strict Documentation Rule: Commission applies ONLY on the referred user's FIRST qualifying transaction
    const priorCommissionForSourceUser = await tx.referralCommission.count({
      where: { sourceUserId },
    });
    if (priorCommissionForSourceUser > 0) {
      return null;
    }

    // Mark source user as qualified referral
    await tx.user.update({
      where: { id: sourceUserId },
      data: { isQualifiedReferral: true },
    });

    // Determine position for beneficiary
    const priorDirectCount = await tx.referralCommission.count({
      where: { beneficiaryId: beneficiary.id },
    });
    const position = priorDirectCount + 1;

    const rates = config.commissionRates || DEFAULT_REFERRAL_CONFIG.commissionRates;
    let ratePercent = Number(rates.pos1 ?? 5);
    if (position === 1) ratePercent = Number(rates.pos1 ?? 5);
    else if (position === 2) ratePercent = Number(rates.pos2 ?? 7);
    else if (position === 3) ratePercent = Number(rates.pos3 ?? 10);
    else if (position === 4) ratePercent = Number(rates.pos4 ?? 12);
    else if (position === 5) ratePercent = Number(rates.pos5 ?? 15);
    else if (position <= 10) ratePercent = Number(rates.range6to10 ?? 15);
    else if (position <= 100) ratePercent = Number(rates.range11to100 ?? 15);
    else if (position <= 500) ratePercent = Number(rates.range101to500 ?? 15);
    else ratePercent = Number(rates.range501Plus ?? 15);

    const commissionCents = Math.floor((netRevenueCents * ratePercent) / 100);
    if (commissionCents <= 0) return null;

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

    const ref = `REF-COMM-${beneficiary.id.slice(0, 8)}-${revenueEventId.slice(0, 8)}-${Date.now()}`;
    const ledgerTx = await LedgerService.postTransaction(
      {
        reference: ref,
        transactionType: LedgerTransactionType.REFERRAL_COMMISSION,
        currency: Currency.USD,
        description: `Position #${position} Referral Commission (${ratePercent}%) on first qualifying transaction by ${sourceUser.fullName}`,
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

    const commission = await tx.referralCommission.create({
      data: {
        beneficiaryId: beneficiary.id,
        sourceUserId: sourceUser.id,
        revenueEventId,
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
        message: `${sourceUser.fullName} completed their first qualifying transaction! +$${(commissionCents / 100).toFixed(2)} USD (${ratePercent}%) credited to your Referral Wallet.`,
        type: 'SUCCESS',
      },
    });

    await this.checkAndAwardMilestones(beneficiary.id, Currency.USD, tx, config);

    return commission;
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

    const qualifiedReferrals = await prisma.user.count({
      where: { referredById: userId, isQualifiedReferral: true },
    });

    const ranks: Array<any> = config.ranks || DEFAULT_REFERRAL_CONFIG.ranks;
    let currentRankObj = ranks[0];
    for (const r of ranks) {
      if (qualifiedReferrals >= r.minQualified) {
        currentRankObj = r;
      }
    }

    const nextMilestoneRank = ranks.find((r) => r.milestoneAt > qualifiedCountForTarget(qualifiedReferrals, ranks));
    function qualifiedCountForTarget(q: number, _list: any[]) {
      return q;
    }

    const targetRank = ranks.find((r) => r.milestoneAt > 0 && qualifiedReferrals < r.milestoneAt) || ranks[ranks.length - 1];
    const targetQualified = targetRank?.milestoneAt || currentRankObj?.maxQualified || 10000;
    const nextRewardUSD = targetRank && qualifiedReferrals < targetRank.milestoneAt ? targetRank.milestoneRewardUSD : 0;

    const milestoneClaims = await prisma.referralMilestoneClaim.findMany({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    return {
      currentRank: currentRankObj?.name || 'New',
      nextRank: nextMilestoneRank?.name || targetRank?.name || 'Maximum Rank',
      totalReferrals,
      qualifiedReferrals,
      targetQualified,
      remainingToNext: Math.max(0, targetQualified - qualifiedReferrals),
      nextRewardUSD,
      milestoneClaims,
      config,
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

    // Issue #8: Single consistent position number matching qualification/commission chronological order!
    const commissionsAsc = [...user.referralCommissions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const positionBySourceUserId = new Map<string, number>();
    commissionsAsc.forEach((c, idx) => {
      if (!positionBySourceUserId.has(c.sourceUserId)) {
        positionBySourceUserId.set(c.sourceUserId, idx + 1);
      }
    });

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
      referralLink: `${env.CORS_ORIGIN === '*' ? 'https://u-ads.com' : env.CORS_ORIGIN}/register?ref=${user.referralCode}`,
      totalReferrals,
      qualifiedReferrals,
      totalCommissionCents,
      currency: 'USD',
      rankProgress,
      referralConfig: rankProgress.config,
      referrals: enrichedReferrals,
      commissions: user.referralCommissions.map((c) => ({
        id: c.id,
        sourceUserId: c.sourceUserId,
        sourceUserName: c.sourceUser.fullName,
        positionNumber: positionBySourceUserId.get(c.sourceUserId) ?? null,
        commissionCents: c.commissionCents,
        currency: 'USD',
        ratePercent: c.ratePercent,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
}
