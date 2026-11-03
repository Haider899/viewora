import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { AccountType, Currency, DepositStatus, EntryType, LedgerTransactionType, UserRole } from '../types/index.js';

export class PaymentService {
  static async getActivePaymentMethods() {
    return await prisma.paymentMethod.findMany({
      where: { isActive: true },
    });
  }

  static async submitDepositRequest(userId: string, data: {
    paymentMethodId: string;
    amountCents: number;
    currency: string;
    transactionRef: string;
    senderPhone?: string;
    senderName?: string;
    proofImageUrl?: string;
  }) {
    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: data.paymentMethodId },
    });

    if (!paymentMethod || !paymentMethod.isActive) {
      throw { statusCode: 400, code: 'INVALID_PAYMENT_METHOD', message: 'Payment method is invalid or inactive.' };
    }

    if (data.amountCents < paymentMethod.minAmountCents || data.amountCents > paymentMethod.maxAmountCents) {
      throw {
        statusCode: 400,
        code: 'AMOUNT_OUT_OF_BOUNDS',
        message: `Amount must be between ${(paymentMethod.minAmountCents / 100).toFixed(2)} and ${(paymentMethod.maxAmountCents / 100).toFixed(2)} ${paymentMethod.currency}.`,
      };
    }

    // Check duplicate transaction reference across all deposits
    const existingRef = await prisma.depositRequest.findFirst({
      where: { transactionRef: data.transactionRef.trim() },
    });

    if (existingRef) {
      throw {
        statusCode: 400,
        code: 'DUPLICATE_REFERENCE',
        message: 'This transaction reference or hash has already been submitted on the platform.',
      };
    }

    return await prisma.depositRequest.create({
      data: {
        userId,
        paymentMethodId: paymentMethod.id,
        amountCents: data.amountCents,
        currency: paymentMethod.currency,
        transactionRef: data.transactionRef.trim(),
        senderPhone: data.senderPhone || null,
        senderName: data.senderName || null,
        proofImageUrl: data.proofImageUrl || null,
        status: DepositStatus.PENDING,
      },
      include: { paymentMethod: true },
    });
  }

  static async getUserDeposits(userId: string) {
    return await prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { paymentMethod: true },
    });
  }

  // Finance Admin Verification
  static async getDepositsForReview(status: string = DepositStatus.PENDING) {
    return await prisma.depositRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, email: true, fullName: true, status: true } },
        paymentMethod: true,
      },
    });
  }

  static async reviewDeposit(
    adminId: string,
    depositId: string,
    action: 'APPROVE' | 'REJECT',
    rejectionReason?: string
  ) {
    const deposit = await prisma.depositRequest.findUnique({
      where: { id: depositId },
      include: { paymentMethod: true },
    });

    if (!deposit) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Deposit request not found.' };
    }

    if (deposit.status !== DepositStatus.PENDING) {
      throw { statusCode: 400, code: 'ALREADY_REVIEWED', message: `Deposit request is already ${deposit.status}.` };
    }

    if (action === 'REJECT') {
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        throw { statusCode: 400, code: 'REASON_REQUIRED', message: 'A descriptive rejection reason is required.' };
      }

      return await prisma.depositRequest.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.REJECTED,
          rejectionReason: rejectionReason.trim(),
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
    }

    // ACTION === 'APPROVE': Execute double-entry ledger credit to user
    return await prisma.$transaction(async (tx) => {
      const cur = deposit.currency as Currency;

      // User Available Account (Credit)
      const userAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
        cur,
        deposit.userId
      );

      // System Cash Account (Debit)
      let sysAccountType = AccountType.SYSTEM_CASH_CRYPTO;
      if (deposit.paymentMethod.code === 'EASYPAISA') sysAccountType = AccountType.SYSTEM_CASH_EASYPAISA;
      else if (deposit.paymentMethod.code === 'JAZZCASH') sysAccountType = AccountType.SYSTEM_CASH_JAZZCASH;

      const systemCashAccount = await LedgerService.getOrCreateAccount(
        tx,
        sysAccountType,
        cur,
        null
      );

      const ref = `DEP-${deposit.id.slice(0, 8)}-${Date.now()}`;

      const ledgerTx = await LedgerService.postTransaction(
        {
          reference: ref,
          transactionType: LedgerTransactionType.DEPOSIT,
          currency: cur,
          description: `Verified deposit via ${deposit.paymentMethod.name} (Ref: ${deposit.transactionRef})`,
          postedById: adminId,
          entries: [
            {
              accountId: systemCashAccount.id,
              entryType: EntryType.DEBIT,
              amountCents: deposit.amountCents,
            },
            {
              accountId: userAccount.id,
              entryType: EntryType.CREDIT,
              amountCents: deposit.amountCents,
            },
          ],
        },
        tx
      );

      const updatedDeposit = await tx.depositRequest.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.APPROVED,
          reviewedById: adminId,
          reviewedAt: new Date(),
          ledgerTxId: ledgerTx.id,
        },
      });

      // Create notification for user
      await tx.notification.create({
        data: {
          userId: deposit.userId,
          title: 'Deposit Approved',
          message: `Your deposit of ${(deposit.amountCents / 100).toFixed(2)} ${deposit.currency} has been verified and credited to your wallet.`,
          type: 'SUCCESS',
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DEPOSIT_APPROVED',
          resourceType: 'DepositRequest',
          resourceId: deposit.id,
          details: JSON.stringify({ amountCents: deposit.amountCents, currency: deposit.currency, ref }),
        },
      });

      return updatedDeposit;
    });
  }

  // Admin Payment Channel Management
  static async getAllPaymentMethods() {
    return await prisma.paymentMethod.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  static async updatePaymentMethod(
    adminId: string,
    id: string,
    data: {
      name?: string;
      accountTitle?: string;
      accountNumber?: string;
      instructions?: string;
      minAmountCents?: number;
      maxAmountCents?: number;
      isActive?: boolean;
      qrCodeUrl?: string;
    }
  ) {
    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.accountTitle !== undefined && { accountTitle: data.accountTitle }),
        ...(data.accountNumber !== undefined && { accountNumber: data.accountNumber }),
        ...(data.instructions !== undefined && { instructions: data.instructions }),
        ...(data.minAmountCents !== undefined && { minAmountCents: data.minAmountCents }),
        ...(data.maxAmountCents !== undefined && { maxAmountCents: data.maxAmountCents }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.qrCodeUrl !== undefined && { qrCodeUrl: data.qrCodeUrl }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_PAYMENT_METHOD',
        resourceType: 'PaymentMethod',
        resourceId: id,
        details: JSON.stringify(data),
      },
    });

    return updated;
  }
}

