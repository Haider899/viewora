import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../lib/prisma.js';
import { LedgerService } from '../services/ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

describe('Double-Entry Financial Ledger Engine', () => {
  beforeAll(async () => {
    // Clean any prior test artifacts
    await prisma.ledgerEntry.deleteMany();
    await prisma.ledgerTransaction.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('strictly rejects transactions where sum(debits) !== sum(credits)', async () => {
    const sysCash = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_CASH_CRYPTO', currency: 'USD' },
    });
    const revAccount = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_REVENUE_PACKAGES', currency: 'USD' },
    });

    expect(sysCash).toBeDefined();
    expect(revAccount).toBeDefined();

    // Debits = 5000 cents ($50), Credits = 4000 cents ($40) -> Imbalance of 1000 cents!
    const unbalancePromise = LedgerService.postTransaction({
      reference: 'TEST-IMBALANCE-001',
      transactionType: LedgerTransactionType.ADJUSTMENT,
      currency: Currency.USD,
      description: 'Illegal unbalanced transaction test',
      entries: [
        {
          accountId: sysCash!.id,
          entryType: EntryType.DEBIT,
          amountCents: 5000,
        },
        {
          accountId: revAccount!.id,
          entryType: EntryType.CREDIT,
          amountCents: 4000,
        },
      ],
    });

    await expect(unbalancePromise).rejects.toThrow(/Ledger imbalance detected/);
  });

  it('atomically posts balanced transactions and updates account balances without floating point drift', async () => {
    const sysCash = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_CASH_CRYPTO', currency: 'USD' },
    });
    const revAccount = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_REVENUE_PACKAGES', currency: 'USD' },
    });

    const initialCash = sysCash!.balanceCents;
    const initialRev = revAccount!.balanceCents;

    const testAmountCents = 2500; // $25.00 exact cents

    const tx = await LedgerService.postTransaction({
      reference: 'TEST-BALANCED-002',
      transactionType: LedgerTransactionType.ADJUSTMENT,
      currency: Currency.USD,
      description: 'Balanced test transaction',
      entries: [
        {
          accountId: sysCash!.id,
          entryType: EntryType.DEBIT,
          amountCents: testAmountCents,
        },
        {
          accountId: revAccount!.id,
          entryType: EntryType.CREDIT,
          amountCents: testAmountCents,
        },
      ],
    });

    expect(tx.id).toBeDefined();

    // Verify balances
    const updatedCash = await prisma.walletAccount.findUnique({ where: { id: sysCash!.id } });
    const updatedRev = await prisma.walletAccount.findUnique({ where: { id: revAccount!.id } });

    expect(updatedCash!.balanceCents).toBe(initialCash + testAmountCents);
    expect(updatedRev!.balanceCents).toBe(initialRev + testAmountCents);
  });

  it('guarantees idempotency by rejecting duplicate transaction references', async () => {
    const sysCash = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_CASH_CRYPTO', currency: 'USD' },
    });
    const revAccount = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_REVENUE_PACKAGES', currency: 'USD' },
    });

    const duplicateRef = 'TEST-IDEMPOTENT-003';

    await LedgerService.postTransaction({
      reference: duplicateRef,
      transactionType: LedgerTransactionType.ADJUSTMENT,
      currency: Currency.USD,
      description: 'First attempt',
      entries: [
        { accountId: sysCash!.id, entryType: EntryType.DEBIT, amountCents: 1000 },
        { accountId: revAccount!.id, entryType: EntryType.CREDIT, amountCents: 1000 },
      ],
    });

    // Replay identical reference
    const replayPromise = LedgerService.postTransaction({
      reference: duplicateRef,
      transactionType: LedgerTransactionType.ADJUSTMENT,
      currency: Currency.USD,
      description: 'Duplicate replay attempt',
      entries: [
        { accountId: sysCash!.id, entryType: EntryType.DEBIT, amountCents: 1000 },
        { accountId: revAccount!.id, entryType: EntryType.CREDIT, amountCents: 1000 },
      ],
    });

    await expect(replayPromise).rejects.toThrow(/already been processed/);
  });

  it('passes comprehensive ledger integrity audit with zero anomalies', async () => {
    const auditResult = await LedgerService.auditLedgerIntegrity();
    expect(auditResult.isValid).toBe(true);
    expect(auditResult.anomalies.length).toBe(0);
  });
});
