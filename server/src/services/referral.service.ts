import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

export class ReferralService {
  /**
   * Processes referral commission for an eligible net revenue event (package purchase).
   * Strict Rule: Never called on pure deposits!
   * Funds are routed directly into the referrer's dedicated USER_REFERRAL wallet.
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

    // Find if user was referred by someone
    const sourceUser = await tx.user.findUnique({
      where: { id: sourceUserId },
      include: { referredBy: true },
    });

    if (!sourceUser || !sourceUser.referredById || !sourceUser.referredBy) {
      return null; // Not referred
    }

    const beneficiary = sourceUser.referredBy;

    // Strict Anti-Fraud Guardrails
    if (beneficiary.id === sourceUserId) {
      console.warn(`[Referral Anti-Fraud] Blocked self-referral for user ${sourceUserId}`);
      return null;
    }

    // Mark source user as qualified referral
    await tx.user.update({
      where: { id: sourceUserId },
      data: { isQualifiedReferral: true },
    });

    // Check duplicate commission for this revenue event (strict one-time check)
    const existingCommission = await tx.referralCommission.findFirst({
      where: { revenueEventId, beneficiaryId: beneficiary.id },
    });
    if (existingCommission) {
      console.warn(`[Referral Anti-Fraud] Duplicate commission prevented for revenue event ${revenueEventId}`);
      return null;
    }

    // Position-based tiered rates as per Section 8:
    // 1st Referral = 5%, 2nd = 7%, 3rd = 10%, 4th = 12%, 5th+ = 15%
    const priorDirectCount = await tx.referralCommission.count({
      where: { beneficiaryId: beneficiary.id },
    });
    const position = priorDirectCount + 1;
    let ratePercent = 5.0;
    if (position === 1) ratePercent = 5.0;
    else if (position === 2) ratePercent = 7.0;
    else if (position === 3) ratePercent = 10.0;
    else if (position === 4) ratePercent = 12.0;
    else ratePercent = 15.0;

    // Calculate commission in minor units (integer cents)
    const commissionCents = Math.floor((netRevenueCents * ratePercent) / 100);
    if (commissionCents <= 0) return null;

    // Post Double-Entry Ledger Credit to Referrer's Dedicated Referral Wallet (USER_REFERRAL)
    // Debit: SYSTEM_EXPENSE_REFERRALS
    // Credit: USER_REFERRAL (Beneficiary)
    const beneficiaryAccount = await LedgerService.getOrCreateAccount(
      tx,
      AccountType.USER_REFERRAL,
      currency,
      beneficiary.id
    );

    const sysExpenseAccount = await LedgerService.getOrCreateAccount(
      tx,
      AccountType.SYSTEM_EXPENSE_REFERRALS,
      currency,
      null
    );

    const ref = `REF-COMM-${beneficiary.id.slice(0, 8)}-${revenueEventId.slice(0, 8)}-${Date.now()}`;
    const ledgerTx = await LedgerService.postTransaction(
      {
        reference: ref,
        transactionType: LedgerTransactionType.REFERRAL_COMMISSION,
        currency,
        description: `Position #${position} Referral Commission (${ratePercent}%) from purchase by ${sourceUser.fullName}`,
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

    // Record commission entry
    const commission = await tx.referralCommission.create({
      data: {
        beneficiaryId: beneficiary.id,
        sourceUserId: sourceUser.id,
        revenueEventId,
        commissionCents,
        currency,
        ratePercent,
        status: 'CREDITED',
        ledgerTxId: ledgerTx.id,
      },
    });

    // Notify beneficiary
    await tx.notification.create({
      data: {
        userId: beneficiary.id,
        title: 'Referral Commission Credited',
        message: `You earned ${(commissionCents / 100).toFixed(2)} ${currency} (Tier rate ${ratePercent}%) directly into your Referral Wallet from ${sourceUser.fullName}.`,
        type: 'SUCCESS',
      },
    });

    // Check and trigger Milestone Rewards (Section 7.2)
    await this.checkAndAwardMilestones(beneficiary.id, currency, tx);

    return commission;
  }

  /**
   * Checks and awards one-time milestone rewards upon reaching qualified referral thresholds:
   * Gold (5) = $20, Platinum (10) = $100, Diamond (100) = $500
   */
  static async checkAndAwardMilestones(
    beneficiaryId: string,
    currency: Currency,
    tx: Prisma.TransactionClient
  ) {
    const qualifiedCount = await tx.user.count({
      where: { referredById: beneficiaryId, isQualifiedReferral: true },
    });

    const milestones = [
      { rank: 'GOLD', count: 5, rewardCents: 2000, desc: 'Gold Milestone Reward (5 Qualified Referrals)' },
      { rank: 'PLATINUM', count: 10, rewardCents: 10000, desc: 'Platinum Milestone Reward (10 Qualified Referrals)' },
      { rank: 'DIAMOND', count: 100, rewardCents: 50000, desc: 'Diamond Milestone Reward (100 Qualified Referrals)' },
    ];

    for (const m of milestones) {
      if (qualifiedCount >= m.count) {
        // Check if already claimed
        const existingClaim = await tx.referralMilestoneClaim.findUnique({
          where: {
            userId_rankName: {
              userId: beneficiaryId,
              rankName: m.rank,
            },
          },
        });

        if (!existingClaim) {
          // Post double-entry credit to USER_REFERRAL
          const beneficiaryAccount = await LedgerService.getOrCreateAccount(
            tx,
            AccountType.USER_REFERRAL,
            currency,
            beneficiaryId
          );

          const sysExpenseAccount = await LedgerService.getOrCreateAccount(
            tx,
            AccountType.SYSTEM_EXPENSE_REFERRALS,
            currency,
            null
          );

          const ref = `MILESTONE-${m.rank}-${beneficiaryId.slice(0, 8)}-${Date.now()}`;
          const ledgerTx = await LedgerService.postTransaction(
            {
              reference: ref,
              transactionType: LedgerTransactionType.MILESTONE_REWARD,
              currency,
              description: m.desc,
              entries: [
                {
                  accountId: sysExpenseAccount.id,
                  entryType: EntryType.DEBIT,
                  amountCents: m.rewardCents,
                },
                {
                  accountId: beneficiaryAccount.id,
                  entryType: EntryType.CREDIT,
                  amountCents: m.rewardCents,
                },
              ],
            },
            tx
          );

          await tx.referralMilestoneClaim.create({
            data: {
              userId: beneficiaryId,
              rankName: m.rank,
              qualifiedCount: m.count,
              rewardAmountCents: m.rewardCents,
              currency: currency as string,
              ledgerTxId: ledgerTx.id,
            },
          });

          await tx.notification.create({
            data: {
              userId: beneficiaryId,
              title: `🎉 ${m.rank} Milestone Unlocked!`,
              message: `Congratulations! You unlocked ${m.rank} rank with ${qualifiedCount} qualified referrals. A reward of $${(m.rewardCents / 100).toFixed(2)} has been credited to your Referral Wallet.`,
              type: 'SUCCESS',
            },
          });
        }
      }
    }
  }

  /**
   * Option B: Transfer from Referral Wallet to Main Account Credits (Section 9)
   */
  static async transferReferralToMainBalance(userId: string, amountCents: number) {
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error('Transfer amount must be a positive integer in cents.');
    }

    return await prisma.$transaction(async (tx) => {
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
          description: `Transferred $${(amountCents / 100).toFixed(2)} from Referral Wallet into Main Account Credits`,
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

      await tx.notification.create({
        data: {
          userId,
          title: 'Referral Balance Converted',
          message: `Successfully transferred $${(amountCents / 100).toFixed(2)} from your Referral Wallet into Main Account Credits.`,
          type: 'SUCCESS',
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
  }

  /**
   * Retrieves user referral rank, progress, and milestone details (Section 7)
   */
  static async getReferralRankAndProgress(userId: string) {
    const totalReferrals = await prisma.user.count({
      where: { referredById: userId },
    });

    const qualifiedReferrals = await prisma.user.count({
      where: { referredById: userId, isQualifiedReferral: true },
    });

    let currentRank = 'New';
    let nextRank = 'Gold';
    let targetQualified = 5;
    let nextRewardUSD = 20;

    if (qualifiedReferrals >= 501) {
      currentRank = 'Rank 5';
      nextRank = 'Maximum Rank';
      targetQualified = 10000;
      nextRewardUSD = 0;
    } else if (qualifiedReferrals >= 101) {
      currentRank = 'Rank 4';
      nextRank = 'Rank 5';
      targetQualified = 501;
      nextRewardUSD = 1000;
    } else if (qualifiedReferrals >= 11) {
      currentRank = 'Diamond';
      nextRank = 'Rank 4';
      targetQualified = 101;
      nextRewardUSD = 500;
    } else if (qualifiedReferrals >= 6) {
      currentRank = 'Platinum';
      nextRank = 'Diamond';
      targetQualified = 11;
      nextRewardUSD = 200;
    } else if (qualifiedReferrals >= 1) {
      currentRank = 'Gold';
      nextRank = 'Platinum';
      targetQualified = 6;
      nextRewardUSD = 100;
    }

    const milestoneClaims = await prisma.referralMilestoneClaim.findMany({
      where: { userId },
      orderBy: { claimedAt: 'desc' },
    });

    return {
      currentRank,
      nextRank,
      totalReferrals,
      qualifiedReferrals,
      targetQualified,
      remainingToNext: Math.max(0, targetQualified - qualifiedReferrals),
      nextRewardUSD,
      milestoneClaims,
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

    return {
      referralCode: user.referralCode,
      referralLink: `${env.CORS_ORIGIN}/register?ref=${user.referralCode}`,
      totalReferrals,
      qualifiedReferrals,
      totalCommissionCents,
      currency: 'USD',
      rankProgress,
      referrals: user.referrals.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        status: r.status,
        isQualified: r.isQualifiedReferral || r.packagePurchases.length > 0,
        createdAt: r.createdAt.toISOString(),
        hasActivePackage: r.packagePurchases.length > 0,
      })),
      commissions: user.referralCommissions.map((c) => ({
        id: c.id,
        sourceUserName: c.sourceUser.fullName,
        commissionCents: c.commissionCents,
        currency: c.currency,
        ratePercent: c.ratePercent,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }
}
