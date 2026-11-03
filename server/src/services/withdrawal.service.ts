import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType, WithdrawalStatus } from '../types/index.js';

export class WithdrawalService {
  /**
   * User creates withdrawal request.
   * Atomically locks funds by transferring from USER_AVAILABLE to USER_RESERVED via ledger hold.
   */
  static async requestWithdrawal(userId: string, data: {
    amountCents: number;
    currency: string;
    payoutMethod: string;
    accountTitle: string;
    accountNumber: string;
  }) {
    const cur = data.currency as Currency;

    return await prisma.$transaction(async (tx) => {
      // 1. Check user available balance
      const availableAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
        cur,
        userId
      );

      if (availableAccount.balanceCents < data.amountCents) {
        throw {
          statusCode: 400,
          code: 'INSUFFICIENT_FUNDS',
          message: `Insufficient available funds. Required: ${(data.amountCents / 100).toFixed(2)} ${cur}, Available: ${(availableAccount.balanceCents / 100).toFixed(2)} ${cur}.`,
        };
      }

      // 2. Reserved Account (Hold)
      const reservedAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_RESERVED,
        cur,
        userId
      );

      // 3. Post hold transaction to lock the balance
      const holdRef = `WDR-HOLD-${userId.slice(0, 8)}-${Date.now()}`;
      const holdLedgerTx = await LedgerService.postTransaction(
        {
          reference: holdRef,
          transactionType: LedgerTransactionType.WITHDRAWAL_HOLD,
          currency: cur,
          description: `Withdrawal hold reservation: ${(data.amountCents / 100).toFixed(2)} ${cur} to ${data.payoutMethod}`,
          entries: [
            {
              accountId: availableAccount.id,
              entryType: EntryType.DEBIT, // decreases available
              amountCents: data.amountCents,
            },
            {
              accountId: reservedAccount.id,
              entryType: EntryType.CREDIT, // increases reserved hold
              amountCents: data.amountCents,
            },
          ],
        },
        tx
      );

      // 4. Create withdrawal request
      const withdrawal = await tx.withdrawalRequest.create({
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

      return withdrawal;
    });
  }

  static async getUserWithdrawals(userId: string) {
    return await prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getWithdrawalsForReview(status?: string) {
    return await prisma.withdrawalRequest.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, status: true } },
      },
    });
  }

  /**
   * Status progression and settlement/release of withdrawal requests
   */
  static async reviewWithdrawal(
    adminId: string,
    withdrawalId: string,
    action: 'APPROVE' | 'REJECT' | 'COMPLETE',
    payload?: { payoutRef?: string; rejectionReason?: string }
  ) {
    const withdrawal = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Withdrawal request not found.' };
    }

    const cur = withdrawal.currency as Currency;

    if (action === 'REJECT') {
      if (!payload?.rejectionReason) {
        throw { statusCode: 400, code: 'REASON_REQUIRED', message: 'A rejection reason is required.' };
      }

      if (withdrawal.status === WithdrawalStatus.COMPLETED) {
        throw { statusCode: 400, code: 'ALREADY_COMPLETED', message: 'Cannot reject an already completed payout.' };
      }

      // Release the hold: Reserved -> Available
      return await prisma.$transaction(async (tx) => {
        const availableAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_AVAILABLE, cur, withdrawal.userId);
        const reservedAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_RESERVED, cur, withdrawal.userId);

        const releaseRef = `WDR-REL-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
        await LedgerService.postTransaction(
          {
            reference: releaseRef,
            transactionType: LedgerTransactionType.WITHDRAWAL_RELEASE,
            currency: cur,
            description: `Release hold for rejected withdrawal: ${(withdrawal.amountCents / 100).toFixed(2)} ${cur}`,
            postedById: adminId,
            entries: [
              {
                accountId: reservedAccount.id,
                entryType: EntryType.DEBIT, // decreases reserved
                amountCents: withdrawal.amountCents,
              },
              {
                accountId: availableAccount.id,
                entryType: EntryType.CREDIT, // restores available
                amountCents: withdrawal.amountCents,
              },
            ],
          },
          tx
        );

        return await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: WithdrawalStatus.REJECTED,
            rejectionReason: payload.rejectionReason,
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
        });
      });
    }

    if (action === 'APPROVE') {
      // Moves from PENDING to APPROVED / PROCESSING
      return await prisma.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.APPROVED,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
    }

    if (action === 'COMPLETE') {
      if (!payload?.payoutRef || payload.payoutRef.trim().length < 4) {
        throw {
          statusCode: 400,
          code: 'PAYOUT_REF_REQUIRED',
          message: 'An external payout confirmation reference/TxHash is strictly required to mark payout as completed.',
        };
      }

      // Settle the funds: Settle Reserved balance against System Cash
      return await prisma.$transaction(async (tx) => {
        const reservedAccount = await LedgerService.getOrCreateAccount(tx, AccountType.USER_RESERVED, cur, withdrawal.userId);

        let sysAccountType = AccountType.SYSTEM_CASH_CRYPTO;
        if (withdrawal.payoutMethod === 'EASYPAISA') sysAccountType = AccountType.SYSTEM_CASH_EASYPAISA;
        else if (withdrawal.payoutMethod === 'JAZZCASH') sysAccountType = AccountType.SYSTEM_CASH_JAZZCASH;

        const sysCashAccount = await LedgerService.getOrCreateAccount(tx, sysAccountType, cur, null);

        const settleRef = `WDR-SET-${withdrawal.id.slice(0, 8)}-${Date.now()}`;
        const settleLedgerTx = await LedgerService.postTransaction(
          {
            reference: settleRef,
            transactionType: LedgerTransactionType.WITHDRAWAL_SETTLE,
            currency: cur,
            description: `Settled withdrawal payout: ${(withdrawal.amountCents / 100).toFixed(2)} ${cur} (Ref: ${payload.payoutRef})`,
            postedById: adminId,
            entries: [
              {
                accountId: reservedAccount.id,
                entryType: EntryType.DEBIT, // clears user reserved liability
                amountCents: withdrawal.amountCents,
              },
              {
                accountId: sysCashAccount.id,
                entryType: EntryType.CREDIT, // decreases system cash asset
                amountCents: withdrawal.amountCents,
              },
            ],
          },
          tx
        );

        return await tx.withdrawalRequest.update({
          where: { id: withdrawalId },
          data: {
            status: WithdrawalStatus.COMPLETED,
            payoutRef: payload.payoutRef.trim(),
            settleLedgerTxId: settleLedgerTx.id,
            completedAt: new Date(),
            reviewedById: adminId,
            reviewedAt: new Date(),
          },
        });
      });
    }

    throw { statusCode: 400, code: 'INVALID_ACTION', message: `Unknown action: ${action}` };
  }
}
