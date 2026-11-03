import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { env } from '../config/env.js';
import { LedgerService } from './ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

export class ReferralService {
  /**
   * Processes referral commission for an eligible net revenue event (package purchase).
   * Strict Rule: Never called on pure deposits!
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

    // Check duplicate commission for this revenue event
    const existingCommission = await tx.referralCommission.findFirst({
      where: { revenueEventId, beneficiaryId: beneficiary.id },
    });
    if (existingCommission) {
      console.warn(`[Referral Anti-Fraud] Duplicate commission prevented for revenue event ${revenueEventId}`);
      return null;
    }

    // Fetch commission percentage rate from system settings
    const setting = await tx.systemSetting.findUnique({
      where: { key: 'COMMISSION_PERCENT' },
    });
    const ratePercent = setting ? parseFloat(setting.value) : env.DEFAULT_COMMISSION_PERCENT;

    // Calculate commission in minor units (integer cents)
    const commissionCents = Math.floor((netRevenueCents * ratePercent) / 100);
    if (commissionCents <= 0) return null;

    // Post Double-Entry Ledger Credit to Referrer's Available Balance
    // Debit: SYSTEM_EXPENSE_REFERRALS
    // Credit: USER_AVAILABLE (Beneficiary)
    const beneficiaryAccount = await LedgerService.getOrCreateAccount(
      tx,
      AccountType.USER_AVAILABLE,
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
        description: `Referral commission (${ratePercent}%) from purchase by ${sourceUser.fullName}`,
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

    // Record commission record
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
        message: `You earned ${(commissionCents / 100).toFixed(2)} ${currency} referral commission from ${sourceUser.fullName}'s package purchase.`,
        type: 'SUCCESS',
      },
    });

    return commission;
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
    const activeReferrals = user.referrals.filter((r) => r.packagePurchases.length > 0).length;

    let totalCommissionCents = 0;
    for (const c of user.referralCommissions) {
      totalCommissionCents += c.commissionCents;
    }

    return {
      referralCode: user.referralCode,
      referralLink: `${env.CORS_ORIGIN}/register?ref=${user.referralCode}`,
      totalReferrals,
      activeReferrals,
      totalCommissionCents,
      currency: 'USD',
      referrals: user.referrals.map((r) => ({
        id: r.id,
        fullName: r.fullName,
        email: r.email,
        status: r.status,
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
