import prisma from '../lib/prisma.js';
import { LedgerService } from './ledger.service.js';
import { NotificationService } from './notification.service.js';
import { AccountLevelService } from './accountLevel.service.js';
import { AccountType, Currency, DepositStatus, EntryType, LedgerTransactionType } from '../types/index.js';

export class PaymentService {
  static async getActivePaymentMethods() {
    return await prisma.paymentMethod.findMany({
      where: { isActive: true, currency: 'USD' },
      orderBy: { createdAt: 'asc' },
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
      throw { statusCode: 400, code: 'INVALID_PAYMENT_METHOD', message: 'Selected payment channel is invalid or inactive.' };
    }

    if (data.amountCents < paymentMethod.minAmountCents || data.amountCents > paymentMethod.maxAmountCents) {
      throw {
        statusCode: 400,
        code: 'AMOUNT_OUT_OF_BOUNDS',
        message: `Deposit amount must be between $${(paymentMethod.minAmountCents / 100).toFixed(2)} and $${(paymentMethod.maxAmountCents / 100).toFixed(2)} USD.`,
      };
    }

    const cleanRef = data.transactionRef.trim();
    if (!cleanRef) {
      throw { statusCode: 400, code: 'INVALID_REFERENCE', message: 'Transaction ID / Reference is required.' };
    }

    // Issue #3: Payment proof screenshot is required for every new deposit submission
    if (!data.proofImageUrl || !data.proofImageUrl.trim()) {
      throw {
        statusCode: 400,
        code: 'PROOF_REQUIRED',
        message: 'A payment receipt screenshot / slip is required to submit a deposit.',
      };
    }

    // Strict duplicate transaction reference prevention across all deposits
    const existingRef = await prisma.depositRequest.findFirst({
      where: { transactionRef: cleanRef },
    });

    if (existingRef) {
      throw {
        statusCode: 400,
        code: 'DUPLICATE_REFERENCE',
        message: 'This transaction reference or hash has already been submitted. Duplicate references are not accepted.',
      };
    }

    const created = await prisma.depositRequest.create({
      data: {
        userId,
        paymentMethodId: paymentMethod.id,
        amountCents: data.amountCents,
        currency: 'USD',
        transactionRef: cleanRef,
        senderPhone: data.senderPhone || null,
        senderName: data.senderName || null,
        proofImageUrl: data.proofImageUrl || null,
        status: DepositStatus.PENDING,
      },
      include: { paymentMethod: true },
    });

    await NotificationService.send({
      userId,
      eventKey: 'depositSubmitted',
      title: 'Deposit Request Submitted',
      message: `Your $${(data.amountCents / 100).toFixed(2)} USD deposit via ${paymentMethod.name} (Ref: ${cleanRef}) is Pending / Under Review. Typical verification takes 10–30 minutes.`,
      type: 'INFO',
    });

    return created;
  }

  static async getUserDeposits(userId: string) {
    return await prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { paymentMethod: true },
    });
  }

  // Finance / Super Admin Verification
  static async getDepositsForReview(status: string = DepositStatus.PENDING) {
    return await prisma.depositRequest.findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, memberCode: true, email: true, fullName: true, status: true } },
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
      if (!rejectionReason || rejectionReason.trim().length < 3) {
        throw { statusCode: 400, code: 'REASON_REQUIRED', message: 'A descriptive rejection reason is required.' };
      }

      const cleanReason = rejectionReason.trim();
      const updated = await prisma.depositRequest.update({
        where: { id: depositId },
        data: {
          status: DepositStatus.REJECTED,
          rejectionReason: cleanReason,
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });

      await NotificationService.send({
        userId: deposit.userId,
        eventKey: 'depositRejected',
        title: 'Deposit Request Rejected',
        message: `Your $${(deposit.amountCents / 100).toFixed(2)} USD deposit (Ref: ${deposit.transactionRef}) was declined. Reason: ${cleanReason}`,
        type: 'DANGER',
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'DEPOSIT_REJECTED',
          resourceType: 'DepositRequest',
          resourceId: deposit.id,
          details: JSON.stringify({
            userId: deposit.userId,
            amountCents: deposit.amountCents,
            currency: 'USD',
            rejectionReason: cleanReason,
          }),
        },
      });

      return updated;
    }

    // ACTION === 'APPROVE': Execute double-entry ledger credit to user's USD Main Account
    const result = await prisma.$transaction(async (tx) => {
      const userAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.USER_AVAILABLE,
        Currency.USD,
        deposit.userId
      );

      const systemCashAccount = await LedgerService.getOrCreateAccount(
        tx,
        AccountType.SYSTEM_CASH_CRYPTO,
        Currency.USD,
        null
      );

      const ref = `DEP-${deposit.id.slice(0, 8)}-${Date.now()}`;

      const ledgerTx = await LedgerService.postTransaction(
        {
          reference: ref,
          transactionType: LedgerTransactionType.DEPOSIT,
          currency: Currency.USD,
          description: `Verified USD deposit via ${deposit.paymentMethod.name} (Ref: ${deposit.transactionRef})`,
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

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'DEPOSIT_APPROVED',
          resourceType: 'DepositRequest',
          resourceId: deposit.id,
          details: JSON.stringify({
            targetUserId: deposit.userId,
            amountCents: deposit.amountCents,
            currency: 'USD',
            ref,
          }),
        },
      });

      return updatedDeposit;
    });

    await NotificationService.send({
      userId: deposit.userId,
      eventKey: 'depositApproved',
      title: 'Deposit Approved & Credited',
      message: `Your deposit of $${(deposit.amountCents / 100).toFixed(2)} USD has been verified and credited to your Main Account.`,
      type: 'SUCCESS',
    });

    // Automatically evaluate account level progression after verified deposit
    await AccountLevelService.calculateAndUpdateUserLevel(deposit.userId).catch(() => {});

    return result;
  }

  // Admin Payment Channel Management (Create, List, Edit, Delete)
  static async getAllPaymentMethods() {
    return await prisma.paymentMethod.findMany({
      where: { currency: 'USD' },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async createPaymentMethod(
    adminId: string,
    data: {
      name: string;
      code?: string;
      accountTitle: string;
      accountNumber: string;
      instructions: string;
      minAmountCents?: number;
      maxAmountCents?: number;
      isActive?: boolean;
      qrCodeUrl?: string;
    }
  ) {
    const code =
      (data.code || data.name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase()) +
      '_' +
      Date.now().toString().slice(-4);

    const created = await prisma.paymentMethod.create({
      data: {
        code,
        name: data.name.trim(),
        currency: 'USD',
        accountTitle: data.accountTitle.trim(),
        accountNumber: data.accountNumber.trim(),
        instructions: data.instructions.trim() || 'Send exact USD amount and upload your receipt and reference.',
        minAmountCents: data.minAmountCents ?? 2000,
        maxAmountCents: data.maxAmountCents ?? 5000000,
        isActive: data.isActive !== undefined ? data.isActive : true,
        qrCodeUrl: data.qrCodeUrl || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'CREATE_PAYMENT_METHOD',
        resourceType: 'PaymentMethod',
        resourceId: created.id,
        details: JSON.stringify({ name: created.name, currency: 'USD', accountNumber: created.accountNumber }),
      },
    });

    return created;
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
        currency: 'USD',
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

  static async deletePaymentMethod(adminId: string, id: string) {
    const linkedDeposits = await prisma.depositRequest.count({ where: { paymentMethodId: id } });
    if (linkedDeposits > 0) {
      // Soft-deactivate if historical deposits exist so ledger audit links stay intact
      const disabled = await prisma.paymentMethod.update({
        where: { id },
        data: { isActive: false },
      });
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'DEACTIVATE_PAYMENT_METHOD',
          resourceType: 'PaymentMethod',
          resourceId: id,
          details: JSON.stringify({ reason: 'Has linked deposits; set inactive.' }),
        },
      });
      return disabled;
    }

    const deleted = await prisma.paymentMethod.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_PAYMENT_METHOD',
        resourceType: 'PaymentMethod',
        resourceId: id,
        details: JSON.stringify({ name: deleted.name }),
      },
    });
    return deleted;
  }
}
