import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app.js';
import prisma from '../lib/prisma.js';
import { LedgerService } from '../services/ledger.service.js';
import { AccountType, Currency, EntryType, LedgerTransactionType } from '../types/index.js';

describe('U-Ads API & RBAC Integration Tests', () => {
  let userToken = '';
  let userId = '';
  let supportToken = '';
  let adminToken = '';
  let paymentMethodId = '';
  let starterPackageId = '';

  it('authenticates seeded users and yields valid JWT session tokens', async () => {
    // 1. Register fresh isolated test user
    const testEmail = `test-${Date.now()}@u-ads.com`;
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: testEmail, password: 'UAdsSecure2026!', fullName: 'Test Isolation User' });

    expect(userRes.status).toBe(201);
    expect(userRes.body.success).toBe(true);
    expect(userRes.body.data.token).toBeDefined();
    userToken = userRes.body.data.token;
    userId = userRes.body.data.user.id;

    // 2. Login support agent
    const suppRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'support@u-ads.com', password: 'UAdsSecure2026!' });
    expect(suppRes.status).toBe(200);
    supportToken = suppRes.body.data.token;

    // 3. Login super admin
    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@innovative.online', password: 'Super@2026' });
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
    expect(pmRes.body.data.length).toBeGreaterThanOrEqual(2);
    paymentMethodId = pmRes.body.data[0].id;
  });

  it('requires proof image on deposit submission and rejects duplicate references', async () => {
    const uniqueTxRef = `TX-TEST-${Date.now()}`;
    const sampleProof = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // 0. Missing proof image must be rejected (400 PROOF_REQUIRED)
    const missingProofRes = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethodId,
        amountCents: 2500,
        currency: 'USD',
        transactionRef: `${uniqueTxRef}-NOPROOF`,
        senderName: 'Test Isolation User',
      });
    expect(missingProofRes.status).toBe(400);
    expect(missingProofRes.body.error.code).toBe('PROOF_REQUIRED');

    // 1. First submission with valid proof (USD Only)
    const res1 = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethodId,
        amountCents: 2500, // $25.00 USD
        currency: 'USD',
        transactionRef: uniqueTxRef,
        senderName: 'Test Isolation User',
        proofImageUrl: sampleProof,
      });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);

    // 2. Duplicate submission with same ref
    const res2 = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethodId,
        amountCents: 2500,
        currency: 'USD',
        transactionRef: uniqueTxRef,
        senderName: 'Test Isolation User',
        proofImageUrl: sampleProof,
      });

    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('DUPLICATE_REFERENCE');
  });

  it('never leaks password reset codes in forgot-password HTTP response', async () => {
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'support@u-ads.com' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.data?.resetCode).toBeUndefined();
    expect(JSON.stringify(forgotRes.body)).not.toMatch(/resetCode/i);
  });

  it('strictly prohibits SUPPORT_AGENT from approving financial deposits (RBAC)', async () => {
    const dep = await prisma.depositRequest.findFirst({
      where: { status: 'PENDING', userId },
    });
    expect(dep).toBeDefined();

    const res = await request(app)
      .post(`/api/v1/admin/deposits/${dep!.id}/review`)
      .set('Authorization', `Bearer ${supportToken}`)
      .send({ action: 'APPROVE' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('prevents package purchase when wallet balance is insufficient', async () => {
    // User still has 0 USD available balance because deposit is PENDING
    const res = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId: starterPackageId });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('allows SUPER_ADMIN to approve deposit and atomically credits USD wallet balance', async () => {
    const dep = await prisma.depositRequest.findFirst({
      where: { status: 'PENDING', userId },
    });
    expect(dep).toBeDefined();

    const res = await request(app)
      .post(`/api/v1/admin/deposits/${dep!.id}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const walletRes = await request(app)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(walletRes.status).toBe(200);
    expect(walletRes.body.data.USD.availableCents).toBeGreaterThanOrEqual(2500);
  });

  it('allows package purchase after deposit and preserves historical snapshot terms', async () => {
    // Now purchase Starter Package ($20 = 2000 cents) using the approved $25 deposit (2500 cents -> 500 cents remaining)
    const buyRes = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId: starterPackageId });

    expect(buyRes.status).toBe(200);
    expect(buyRes.body.success).toBe(true);
    expect(buyRes.body.data.packageName).toBe('Starter');
    expect(buyRes.body.data.videoLimitGranted).toBe(2);

    const walletRes = await request(app)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${userToken}`);

    expect(walletRes.body.data.USD.availableCents).toBe(500);
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
      data: { completed: true, completedAt: new Date(), watchSeconds: video!.durationSeconds },
    });

    // Claim reward first time
    const claimRes1 = await request(app)
      .post(`/api/v1/videos/${video!.id}/claim-reward`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionToken });

    expect(claimRes1.status).toBe(200);
    expect(claimRes1.body.success).toBe(true);
    expect(claimRes1.body.data.amountCents).toBeGreaterThan(0);

    // Verify USER_VIDEO_REWARDS balance increased immediately
    const walletAfterReward = await request(app)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${userToken}`);
    expect(walletAfterReward.status).toBe(200);
    expect(walletAfterReward.body.data.USD.videoRewardsCents).toBeGreaterThanOrEqual(
      claimRes1.body.data.amountCents
    );

    // Duplicate claim attempt for identical video
    const claimRes2 = await request(app)
      .post(`/api/v1/videos/${video!.id}/claim-reward`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionToken });

    expect(claimRes2.status).toBe(400);
    expect(claimRes2.body.error.code).toBe('ALREADY_CLAIMED');
  });

  it('enforces API security on locked next-level videos (strips videoUrl & returns 403 on direct API access)', async () => {
    // Starter user has videoLimit = 2; video at orderIndex 8 should be locked
    const listRes = await request(app)
      .get('/api/v1/videos')
      .set('Authorization', `Bearer ${userToken}`);
    expect(listRes.status).toBe(200);
    const lockedVid = listRes.body.data.find((v: any) => v.hasAccess === false);
    expect(lockedVid).toBeDefined();
    expect(lockedVid.videoUrl).toBe('');

    const detailRes = await request(app)
      .get(`/api/v1/videos/${lockedVid.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.hasAccess).toBe(false);
    expect(detailRes.body.data.videoUrl).toBe('');

    const sessionRes = await request(app)
      .post(`/api/v1/videos/${lockedVid.id}/session`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(sessionRes.status).toBe(403);
    expect(sessionRes.body.error.code).toBe('ACCESS_RESTRICTED');

    const claimRes = await request(app)
      .post(`/api/v1/videos/${lockedVid.id}/claim-reward`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ sessionToken: 'fake-token' });
    expect(claimRes.status).toBe(403);
    expect(claimRes.body.error.code).toBe('ACCESS_RESTRICTED');
  });

  it('tracks daily video completion window and blocks premature daily reward claim', async () => {
    const statusRes = await request(app)
      .get('/api/v1/videos/daily-status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.success).toBe(true);
    expect(statusRes.body.data.videosRequired).toBeGreaterThanOrEqual(2);
    expect(statusRes.body.data.videosCompletedToday).toBe(1);
    expect(statusRes.body.data.eligibleToClaim).toBe(false);

    // Attempting to claim before completing all required videos must fail
    const earlyClaim = await request(app)
      .post('/api/v1/videos/daily-claim')
      .set('Authorization', `Bearer ${userToken}`);
    expect(earlyClaim.status).toBe(400);
    expect(earlyClaim.body.error.code).toBe('INCOMPLETE_DAILY_VIDEOS');
  });

  it('strictly blocks withdrawing deposited/subscription funds (Part 1 Rule 3 & Part 3 #3)', async () => {
    const withdrawRes = await request(app)
      .post('/api/v1/withdrawals/request')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        amountCents: 1000,
        currency: 'USD',
        payoutMethod: 'BINANCE',
        accountTitle: 'Test Isolation User',
        accountNumber: 'BINANCE-UID-123456',
        sourceWallet: 'USER_AVAILABLE',
      });
    expect(withdrawRes.status).toBe(400);
    expect(withdrawRes.body.error.code).toBe('DEPOSIT_NOT_WITHDRAWABLE');
  });

  it('charges ONLY the price difference when upgrading from Starter ($20) to Basic ($50)', async () => {
    // Credit $30.00 subscription deposit credit (user currently has $5.00 left from earlier -> total $35.00)
    const acct = await prisma.walletAccount.findFirst({
      where: { userId, accountType: 'USER_AVAILABLE', currency: 'USD' },
    });
    expect(acct).toBeDefined();
    await prisma.walletAccount.update({
      where: { id: acct!.id },
      data: { balanceCents: 3500 },
    });

    const pkgRes = await request(app)
      .get('/api/v1/packages')
      .set('Authorization', `Bearer ${userToken}`);
    const basicPkg = pkgRes.body.data.find((p: any) => p.name === 'Basic');
    expect(basicPkg).toBeDefined();
    expect(basicPkg.isUpgrade).toBe(true);
    expect(basicPkg.upgradeDiffCents).toBe(3000); // $50 - $20 = $30

    const upgRes = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId: basicPkg.id });
    expect(upgRes.status).toBe(200);
    expect(upgRes.body.data.isUpgrade).toBe(true);
    expect(upgRes.body.data.amountChargedCents).toBe(3000);

    // Verify remaining USER_AVAILABLE is $5.00 (3500 - 3000 = 500), NOT negative or $0!
    const walletAfter = await request(app)
      .get('/api/v1/wallet/summary')
      .set('Authorization', `Bearer ${userToken}`);
    expect(walletAfter.body.data.USD.availableCents).toBe(500);
  });

  it('returns 20 pre-loaded Live Activity Popups, allows Support Agent IP view, and delivers Admin direct messages', async () => {
    const popupRes = await request(app).get('/api/v1/live-popups');
    expect(popupRes.status).toBe(200);
    expect(popupRes.body.data.items.length).toBeGreaterThanOrEqual(20);

    const ipRes = await request(app)
      .get('/api/v1/admin/users/ip-groups')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(ipRes.status).toBe(200);
    expect(Array.isArray(ipRes.body.data)).toBe(true);

    const dmSend = await request(app)
      .post(`/api/v1/admin/users/${userId}/message`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Welcome Verification Notice',
        message: 'Hello from U-Ads Admin!',
      });
    expect(dmSend.status).toBe(201);

    const dmInbox = await request(app)
      .get('/api/v1/messages')
      .set('Authorization', `Bearer ${userToken}`);
    expect(dmInbox.status).toBe(200);
    expect(dmInbox.body.data.length).toBeGreaterThanOrEqual(1);
    expect(dmInbox.body.data[0].message).toBe('Hello from U-Ads Admin!');
  });
});
