import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import prisma from '../lib/prisma.js';
import { LedgerService } from '../services/ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

describe('VistaraX API & RBAC Integration Tests', () => {
  let userToken = '';
  let userId = '';
  let supportToken = '';
  let adminToken = '';
  let paymentMethodId = '';
  let starterPackageId = '';

  it('authenticates seeded users and yields valid JWT session tokens', async () => {
    // 1. Register fresh isolated test user
    const testEmail = `test-${Date.now()}@vistarax.com`;
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'VistaraSecure2026!', fullName: 'Test Isolation User' });

    expect(userRes.status).toBe(201);
    expect(userRes.body.success).toBe(true);
    expect(userRes.body.data.token).toBeDefined();
    userToken = userRes.body.data.token;
    userId = userRes.body.data.user.id;

    // 2. Login support agent
    const suppRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'support@vistarax.com', password: 'VistaraSecure2026!' });
    expect(suppRes.status).toBe(200);
    supportToken = suppRes.body.data.token;

    // 3. Login super admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@vistarax.com', password: 'VistaraSecure2026!' });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.token;
  });

  it('fetches public packages and payment methods', async () => {
    const pkgRes = await request(app).get('/api/v1/packages');
    expect(pkgRes.status).toBe(200);
    expect(pkgRes.body.data.length).toBeGreaterThanOrEqual(4);
    const starter = pkgRes.body.data.find((p: any) => p.name === 'Starter');
    expect(starter).toBeDefined();
    starterPackageId = starter.id;

    const pmRes = await request(app).get('/api/v1/payments/methods');
    expect(pmRes.status).toBe(200);
    expect(pmRes.body.data.length).toBeGreaterThanOrEqual(3);
    paymentMethodId = pmRes.body.data[0].id;
  });

  it('rejects duplicate deposit transaction references', async () => {
    const uniqueTxRef = `TX-TEST-${Date.now()}`;

    // First submission
    const res1 = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethodId,
        amountCents: 200000, // 2,000 PKR
        currency: 'PKR',
        transactionRef: uniqueTxRef,
        senderName: 'David Sterling',
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);

    // Duplicate submission with same ref
    const res2 = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethodId,
        amountCents: 200000,
        currency: 'PKR',
        transactionRef: uniqueTxRef,
        senderName: 'David Sterling',
      });

    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('DUPLICATE_REFERENCE');
  });

  it('strictly prohibits SUPPORT_AGENT from approving financial deposits (RBAC)', async () => {
    // Fetch pending deposit
    const dep = await prisma.depositRequest.findFirst({
      where: { status: 'PENDING' },
    });
    expect(dep).toBeDefined();

    // Attempt approval with SUPPORT_AGENT token
    const res = await request(app)
      .post(`/api/v1/admin/deposits/${dep!.id}/review`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ action: 'APPROVE' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows SUPER_ADMIN to approve deposit and atomically credits wallet balance', async () => {
    const dep = await prisma.depositRequest.findFirst({
      where: { status: 'PENDING' },
    });

    const res = await request(app)
      .post(`/api/v1/admin/deposits/${dep!.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify wallet summary for user has updated balance
    const walletRes = await request(app)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(walletRes.status).toBe(200);
    expect(walletRes.body.data.PKR.availableCents).toBeGreaterThan(0);
  });

  it('prevents package purchase when wallet balance is insufficient', async () => {
    // User has 0 USD available balance
    const res = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId: starterPackageId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('allows package purchase after deposit and preserves historical snapshot terms', async () => {
    // Credit $100.00 USD to user's available balance via ledger
    const userUsd = await prisma.walletAccount.findFirst({
      where: { userId, accountType: 'USER_AVAILABLE', currency: 'USD' },
    });
    const sysCash = await prisma.walletAccount.findFirst({
      where: { accountType: 'SYSTEM_CASH_CRYPTO', currency: 'USD' },
    });

    await LedgerService.postTransaction({
      reference: `TEST-SEED-CREDIT-${Date.now()}`,
      transactionType: LedgerTransactionType.DEPOSIT,
      currency: Currency.USD,
      description: 'Test seed credit for package purchase',
      entries: [
        { accountId: sysCash!.id, entryType: EntryType.DEBIT, amountCents: 10000 },
        { accountId: userUsd!.id, entryType: EntryType.CREDIT, amountCents: 10000 },
      ],
    });

    // Now purchase Starter Package ($20 = 2000 cents)
    const buyRes = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId: starterPackageId });

    expect(buyRes.status).toBe(200);
    expect(buyRes.body.success).toBe(true);
    expect(buyRes.body.data.packageName).toBe('Starter');
    expect(buyRes.body.data.videoLimitGranted).toBe(2);

    // Check user's remaining USD balance is 10000 - 2000 = 8000 cents
    const walletRes = await request(app)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(walletRes.body.data.USD.availableCents).toBe(8000);
  });

  it('strictly blocks duplicate reward claims for the same video', async () => {
    const video = await prisma.video.findFirst({
      where: { isPublished: true, rewardEligible: true, orderIndex: 1 },
    });
    expect(video).toBeDefined();

    // Start session
    const sessionRes = await request(app)
      .post(`/api/v1/videos/${video!.id}/session`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(sessionRes.status).toBe(200);
    const sessionToken = sessionRes.body.data.sessionToken;

    // Simulate completion
    await prisma.videoSession.update({
      where: { sessionToken },
      data: { completed: true, watchSeconds: video!.durationSeconds },
    });

    // Claim reward first time
    const claimRes1 = await request(app)
      .post(`/api/v1/videos/${video!.id}/claim-reward`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionToken });

    expect(claimRes1.status).toBe(200);
    expect(claimRes1.body.success).toBe(true);

    // Duplicate claim attempt for identical video
    const claimRes2 = await request(app)
      .post(`/api/v1/videos/${video!.id}/claim-reward`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionToken });

    expect(claimRes2.status).toBe(400);
    expect(claimRes2.body.error.code).toBe('ALREADY_CLAIMED');
  });
});
