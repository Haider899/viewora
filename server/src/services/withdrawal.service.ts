import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType, WithdrawalStatus } from '../types/index.js';

export class WithdrawalService {
  /**
   * User creates USD withdrawal request from Main Account, Video Rewards, or Referral Wallet.
   * Atomically locks funds by transferring from selected wallet to USER_RESERVED via ledger hold.
   */
  static async requestWithdrawal(userId: string, data: {
    amountCents: number;
    currency?: string;
    payoutMethod: string;
    accountTitle: string;
    accountNumber: string;
    sourceWallet?: 'USER_AVAILABLE' | 'USER_VIDEO_REWARDS' | 'USER_REFERRAL' | 'USER_OTHER_REWARDS';
  }) {
    const cur = Currency.USD;
    const minSetting = await prisma.systemSetting.findUnique({ where: { key: 'MIN_WITHDRAWAL_USD_CENTS' } });
    const minCents = minSetting && !isNaN(parseInt(minSetting.value)) ? parseInt(minSetting.value) : 1000;

    if (data.amountCents < minCents) {
      throw {
        statusCode: 400,
        code: 'BELOW_MINIMUM',
        message: `Minimum withdrawal amount is $${(minCents / 100).toFixed(2)} USD.`,
      };
    }

    const validSources = ['USER_AVAILABLE', 'USER_VIDEO_REWARDS', 'USER_REFERRAL', 'USER_OTHER_REWARDS'];
    const sourceAccountType = (
      data.sourceWallet && validSources.includes(data.sourceWallet)
        ? data.sourceWallet
        : AccountType.USER_AVAILABLE
    ) as AccountType;

    const created = await prisma.$transaction(async (tx) => {
      const sourceAccount = await LedgerService.getOrCreateAccount(
        tx,
        sourceAccountType,
        cur,
        userId
      );

      if (sourceAccount.balanceCents < data.amountCents) {
        throw {
          statusCode: 400,
          code: 'INSUFFICIENT_FUNDS',
          message: `Insufficient funds in selected wallet. Required: $${(data.amountCents / 100).toFixed(2)} USD, Available: $${(sourceAccount.balanceCents / 100).toFixed(2)} USD.`,
        };
      }

      const reservedAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_RESERVED,
        cur,
        userId
      );

      const holdRef = `WDR-HOLD-${userId.slice(0, 8)}-${Date.now()}`;
      const holdLedgerTx = await LedgerService.postTransaction(
        {
          reference: holdRef,
          transactionType: LedgerTransactionType.WITHDRAWAL_HOLD,
          currency: cur,
          description: `Withdrawal hold reservation from ${sourceAccountType}: $${(data.amountCents / 100).toFixed(2)} USD via ${data.payoutMethod}`,
          entries: [
            {
              accountId: sourceAccount.id,
              entryType: EntryType.DEBIT,
              amountCents: data.amountCents,
            },
            {
              accountId: reservedAccount.id,
              entryType: EntryType.CREDIT,
              amountCents: data.amountCents,
            },
          ],
        },
        tx
      );

      return await tx.withdrawalRequest.create({
        data: {
          userId,
          amountCents: data.amountCents,
          currency: cur,
          payoutMethod: data.payoutMethod,
          accountTitle: data.accountTitle,
          accountNumber: data.accountNumber,
          status: WithdrawalStatus.PENDING,
          holdLedgerTxId: holdLedgerTx.id,
        },
      });
    });

    await NotificationService.send({
      userId,
      eventKey: 'withdrawalLifecycle',
      title: 'Withdrawal Request Submitted',
      message: `Your payout request of $${(data.amountCents / 100).toFixed(2)} USD is Pending and securely reserved on hold.`,
      type: 'INFO',
    });

    return created;
  }

  static async getUserWithdrawals(userId: string) {
    return await prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getWithdrawalsForReview(status?: string) {
    return await prisma.withdrawalRequest.findMany({
      where: status && status !== 'ALL' ? { status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, memberCode: true, email: true, fullName: true, status: true } },
      },
    });
  }

  /**
   * Full Withdrawal Lifecycle:
   * PENDING -> UNDER_REVIEW -> APPROVED -> PROCESSING -> PAID / COMPLETED
   * Or REJECT / FAILED -> releases reserved hold back to USER_AVAILABLE
   */
  static async reviewWithdrawal(
    adminId: string,
    withdrawalId: string,
    action: 'UNDER_REVIEW' | 'APPROVE' | 'PROCESSING' | 'PAID' | 'COMPLETE' | 'REJECT' | 'FAILED',
    payload?: { payoutRef?: string; payoutProofUrl?: string; rejectionReason?: string }
  ) {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Withdrawal request not found.' };
    }

    // Issue #5: Once a withdrawal decision is finalized (COMPLETED, PAID, REJECTED, FAILED, CANCELLED), lock it permanently!
    const finalizedStatuses = [
      WithdrawalStatus.COMPLETED,
      WithdrawalStatus.PAID,
      WithdrawalStatus.REJECTED,
      WithdrawalStatus.FAILED,
      WithdrawalStatus.CANCELLED,
    ];
    if (finalizedStatuses.includes(withdrawal.status as WithdrawalStatus)) {
      throw {
        statusCode: 400,
        code: 'ALREADY_FINALIZED',
        message: `This withdrawal decision is finalized (${withdrawal.status}) and locked. Historical decisions cannot be modified.`,
      };
    }

    const cur = Currency.USD;

    if (action === 'REJECT' || action === 'FAILED') {
      const reason = payload?.rejectionReason?.trim() || (action === 'FAILED' ? 'External payout transfer failed' : '');
      if (!reason || reason.length < 3) {
        throw { statusCode: 400, code: 'REASON_REQUIRED', message: 'A clear reason is required.' };
      }

      if (withdrawal.status === WithdrawalStatus.COMPLETED || withdrawal.status === WithdrawalStatus.PAID) {
        throw { statusCode: 400, code: 'ALREADY_COMPLETED', message: 'Cannot reject or fail an already settled payout.' };
      }
      if (withdrawal.status === WithdrawalStatus.REJECTED || withdrawal.status === WithdrawalStatus.FAILED) {
        throw { statusCode: 400, code: 'ALREADY_FINALIZED', message: `Withdrawal is already marked ${withdrawal.status}.` };
      }

      const targetStatus = action === 'FAILED' ? WithdrawalStatus.FAILED : WithdrawalStatus.REJECTED;

      const updated = await prisma.$transaction(async (tx) => {
        const availableAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_AVAILABLE, cur, withdrawal.userId);
        const reservedAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_RESERVED, cur, withdrawal.userId);

        const releaseRef = `WDR-REL-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
        await LedgerService.postTransaction(
          {
            reference: releaseRef,
            transactionType: LedgerTransactionType.WITHDRAWAL_RELEASE,
            currency: cur,
            description: `Release hold (${targetStatus}): $${(withdrawal.amountCents / 100).toFixed(2)} USD — ${reason}`,
            postedById: adminId,
            entries: [
              {
                accountId: reservedAccount.id,
                entryType: EntryType.DEBIT,
                amountCents: withdrawal.amountCents,
              },
              {
                accountId: availableAccount.id,
                entryType: EntryType.CREDIT,
                amountCents: withdrawal.amountCents,
              },
            ],
          },
          tx
        );

        const row = await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: targetStatus,
            rejectionReason: reason,
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: `WITHDRAWAL_${targetStatus}`,
            resourceType: 'WithdrawalRequest',
            resourceId: withdrawalId,
            details: JSON.stringify({
              userId: withdrawal.userId,
              amountCents: withdrawal.amountCents,
              currency: 'USD',
              payoutMethod: withdrawal.payoutMethod,
              reason,
            }),
          },
        });

        return row;
      });

      await NotificationService.send({
        userId: withdrawal.userId,
        eventKey: 'withdrawalLifecycle',
        title: `Withdrawal ${targetStatus === 'FAILED' ? 'Failed' : 'Rejected'} & Funds Released`,
        message: `Your $${(withdrawal.amountCents / 100).toFixed(2)} USD withdrawal was marked ${targetStatus}. Reason: ${reason}. Reserved funds have been returned to your Main Account.`,
        type: 'DANGER',
      });

      return updated;
    }

    if (action === 'UNDER_REVIEW' || action === 'APPROVE' || action === 'PROCESSING') {
      const nextStatus =
        action === 'UNDER_REVIEW'
          ? WithdrawalStatus.UNDER_REVIEW
          : action === 'PROCESSING'
          ? WithdrawalStatus.PROCESSING
          : WithdrawalStatus.APPROVED;

      const updated = await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: nextStatus,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: `WITHDRAWAL_${nextStatus}`,
          resourceType: 'WithdrawalRequest',
          resourceId: withdrawalId,
          details: JSON.stringify({
            userId: withdrawal.userId,
            amountCents: withdrawal.amountCents,
            currency: 'USD',
            payoutMethod: withdrawal.payoutMethod,
          }),
        },
      });

      await NotificationService.send({
        userId: withdrawal.userId,
        eventKey: 'withdrawalLifecycle',
        title: `Withdrawal Status: ${nextStatus.replace('_', ' ')}`,
        message: `Your $${(withdrawal.amountCents / 100).toFixed(2)} USD withdrawal request is now ${nextStatus.replace('_', ' ')}.`,
        type: 'INFO',
      });

      return updated;
    }

    if (action === 'COMPLETE' || action === 'PAID') {
      if (!payload?.payoutRef || payload.payoutRef.trim().length < 4) {
        throw {
          statusCode: 400,
          code: 'PAYOUT_REF_REQUIRED',
          message: 'An external payout confirmation reference / TxHash is strictly required to mark payout as Paid / Completed.',
        };
      }

      if (withdrawal.status === WithdrawalStatus.COMPLETED || withdrawal.status === WithdrawalStatus.PAID) {
        throw { statusCode: 400, code: 'ALREADY_COMPLETED', message: 'Payout has already been settled.' };
      }

      const payoutRef = payload.payoutRef.trim();

      const updated = await prisma.$transaction(async (tx) => {
        const reservedAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_RESERVED, cur, withdrawal.userId);
        const sysCashAccount = await LedgerService.getOrCreateAccount(tx, AccountType.SYSTEM_CASH_CRYPTO, cur, null);

        const settleRef = `WDR-SET-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
        const settleLedgerTx = await LedgerService.postTransaction(
          {
            reference: settleRef,
            transactionType: LedgerTransactionType.WITHDRAWAL_SETTLE,
            currency: cur,
            description: `Settled USD withdrawal payout: $${(withdrawal.amountCents / 100).toFixed(2)} USD (Ref: ${payoutRef})`,
            postedById: adminId,
            entries: [
              {
                accountId: reservedAccount.id,
                entryType: EntryType.DEBIT,
                amountCents: withdrawal.amountCents,
              },
              {
                accountId: sysCashAccount.id,
                entryType: EntryType.CREDIT,
                amountCents: withdrawal.amountCents,
              },
            ],
          },
          tx
        );

        const row = await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: WithdrawalStatus.COMPLETED,
            payoutRef,
            payoutProofUrl: payload?.payoutProofUrl?.trim() || null,
            settleLedgerTxId: settleLedgerTx.id,
            completedAt: new Date(),
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'WITHDRAWAL_COMPLETED',
            resourceType: 'WithdrawalRequest',
            resourceId: withdrawalId,
            details: JSON.stringify({
              userId: withdrawal.userId,
              amountCents: withdrawal.amountCents,
              currency: 'USD',
              payoutRef,
              accountTitle: withdrawal.accountTitle,
              accountNumber: withdrawal.accountNumber,
              payoutMethod: withdrawal.payoutMethod,
            }),
          },
        });

        return row;
      });

      await NotificationService.send({
        userId: withdrawal.userId,
        eventKey: 'withdrawalLifecycle',
        title: 'Withdrawal Paid & Completed!',
        message: `Your payout of $${(withdrawal.amountCents / 100).toFixed(2)} USD has been completed. External Proof Ref: ${payoutRef}`,
        type: 'SUCCESS',
      });

      return updated;
    }

    throw { statusCode: 400, code: 'INVALID_ACTION', message: `Unknown action: ${action}` };
  }
}
