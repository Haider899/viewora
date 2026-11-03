import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

export interface PostEntryInput {
  accountId: string;
  entryType: EntryType;
  amountCents: number; // positive integer in minor units
}

export interface PostTransactionInput {
  reference: string; // Idempotency key / unique transaction reference
  transactionType: LedgerTransactionType;
  currency: Currency;
  description: string;
  postedById?: string;
  entries: PostEntryInput[];
}

export class LedgerService {
  /**
   * Helper to ensure an account exists for a user or system
   */
  static async getOrCreateAccount(
    tx: Prisma.TransactionClient,
    accountType: AccountType,
    currency: Currency,
    userId?: string | null
  ) {
    const existing = await tx.walletAccount.findFirst({
      where: {
        userId: userId || null,
        accountType,
        currency,
      },
    });

    if (existing) {
      return existing;
    }

    return await tx.walletAccount.create({
      data: {
        userId: userId || null,
        accountType,
        currency,
        balanceCents: 0,
      },
    });
  }

  /**
   * Posts an immutable double-entry transaction.
   * Guarantees that sum(DEBITS) === sum(CREDITS).
   * Throws error if transaction reference already exists (Idempotent).
   */
  static async postTransaction(
    input: PostTransactionInput,
    externalTx?: Prisma.TransactionClient
  ) {
    // 1. Invariant verification: amounts must be positive integers
    if (input.entries.length < 2) {
      throw new Error('A double-entry transaction must contain at least two entries.');
    }

    let totalDebits = 0;
    let totalCredits = 0;

    for (const entry of input.entries) {
      if (!Number.isInteger(entry.amountCents) || entry.amountCents <= 0) {
        throw new Error(`Invalid entry amount: ${entry.amountCents}. Must be a positive integer in minor currency units.`);
      }

      if (entry.entryType === EntryType.DEBIT) {
        totalDebits += entry.amountCents;
      } else if (entry.entryType === EntryType.CREDIT) {
        totalCredits += entry.amountCents;
      } else {
        throw new Error(`Invalid entry type: ${entry.entryType}`);
      }
    }

    // 2. Fundamental Ledger Balancing Invariant
    if (totalDebits !== totalCredits) {
      throw new Error(
        `Ledger imbalance detected! Total debits (${totalDebits}) must equal total credits (${totalCredits}). Transaction rejected.`
      );
    }

    const executeOperation = async (tx: Prisma.TransactionClient) => {
      // Check for duplicate reference
      const existingTx = await tx.ledgerTransaction.findUnique({
        where: { reference: input.reference },
      });
      if (existingTx) {
        throw new Error(`Transaction with reference '${input.reference}' has already been processed.`);
      }

      // Create transaction header
      const ledgerTx = await tx.ledgerTransaction.create({
        data: {
          reference: input.reference,
          transactionType: input.transactionType,
          currency: input.currency,
          description: input.description,
          postedById: input.postedById || null,
        },
      });

      // Create individual entries & update cached account balances
      for (const entry of input.entries) {
        await tx.ledgerEntry.create({
          data: {
            transactionId: ledgerTx.id,
            accountId: entry.accountId,
            entryType: entry.entryType,
            amountCents: entry.amountCents,
          },
        });

        // Account balance impact:
        // For liability/equity accounts (like user balances), CREDIT increases balance, DEBIT decreases balance.
        // For asset accounts (like system cash), DEBIT increases balance, CREDIT decreases balance.
        // For standardized tracking across all accounts:
        // USER accounts: CREDIT increases available/reserved balance, DEBIT decreases it.
        const account = await tx.walletAccount.findUniqueOrThrow({
          where: { id: entry.accountId },
        });

        let balanceDelta = 0;
        if (
          account.accountType === AccountType.USER_AVAILABLE ||
          account.accountType === AccountType.USER_RESERVED
        ) {
          // User balance: CREDIT is positive (funds added), DEBIT is negative (funds deducted)
          balanceDelta = entry.entryType === EntryType.CREDIT ? entry.amountCents : -entry.amountCents;
        } else if (
          account.accountType.startsWith('SYSTEM_CASH')
        ) {
          // Cash asset: DEBIT increases cash on hand, CREDIT decreases cash on hand
          balanceDelta = entry.entryType === EntryType.DEBIT ? entry.amountCents : -entry.amountCents;
        } else {
          // Revenue/Expense accounts
          balanceDelta = entry.entryType === EntryType.CREDIT ? entry.amountCents : -entry.amountCents;
        }

        const newBalance = account.balanceCents + balanceDelta;
        
        // Prevent user available balance from going negative
        if (
          (account.accountType === AccountType.USER_AVAILABLE ||
           account.accountType === AccountType.USER_RESERVED) &&
          newBalance < 0
        ) {
          throw new Error(
            `Insufficient funds for account ${account.id}. Current: ${account.balanceCents}, Required debit: ${entry.amountCents}.`
          );
        }

        await tx.walletAccount.update({
          where: { id: account.id },
          data: { balanceCents: newBalance },
        });
      }

      return ledgerTx;
    };

    if (externalTx) {
      return await executeOperation(externalTx);
    } else {
      return await prisma.$transaction(async (tx) => {
        return await executeOperation(tx);
      });
    }
  }

  /**
   * Retrieves summary of wallet balances for a user (USD and PKR)
   */
  static async getUserWalletSummary(userId: string) {
    const accounts = await prisma.walletAccount.findMany({
      where: { userId },
    });

    const summary = {
      USD: { availableCents: 0, reservedCents: 0, totalCents: 0 },
      PKR: { availableCents: 0, reservedCents: 0, totalCents: 0 },
    };

    for (const acc of accounts) {
      const cur = acc.currency as Currency;
      if (cur === Currency.USD || cur === Currency.PKR) {
        if (acc.accountType === AccountType.USER_AVAILABLE) {
          summary[cur].availableCents = acc.balanceCents;
        } else if (acc.accountType === AccountType.USER_RESERVED) {
          summary[cur].reservedCents = acc.balanceCents;
        }
      }
    }

    summary.USD.totalCents = summary.USD.availableCents + summary.USD.reservedCents;
    summary.PKR.totalCents = summary.PKR.availableCents + summary.PKR.reservedCents;

    return summary;
  }

  /**
   * Retrieves user ledger transaction history with pagination
   */
  static async getUserTransactions(
    userId: string,
    options: { page?: number; pageSize?: number; currency?: Currency } = {}
  ) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    // Find all user accounts
    const userAccounts = await prisma.walletAccount.findMany({
      where: {
        userId,
        ...(options.currency ? { currency: options.currency } : {}),
      },
      select: { id: true },
    });

    const accountIds = userAccounts.map((a) => a.id);
    if (accountIds.length === 0) {
      return { transactions: [], total: 0, page, pageSize };
    }

    const [entries, total] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: { accountId: { in: accountIds } },
        include: {
          transaction: true,
          account: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.ledgerEntry.count({
        where: { accountId: { in: accountIds } },
      }),
    ]);

    return { entries, total, page, pageSize };
  }

  /**
   * Validates whole ledger integrity: checks that all posted transactions balance.
   */
  static async auditLedgerIntegrity() {
    const transactions = await prisma.ledgerTransaction.findMany({
      include: { entries: true },
    });

    const anomalies: Array<{ txId: string; reference: string; debits: number; credits: number }> = [];

    for (const tx of transactions) {
      let debits = 0;
      let credits = 0;
      for (const entry of tx.entries) {
        if (entry.entryType === EntryType.DEBIT) debits += entry.amountCents;
        if (entry.entryType === EntryType.CREDIT) credits += entry.amountCents;
      }
      if (debits !== credits) {
        anomalies.push({ txId: tx.id, reference: tx.reference, debits, credits });
      }
    }

    return {
      totalAudited: transactions.length,
      isValid: anomalies.length === 0,
      anomalies,
    };
  }
}
