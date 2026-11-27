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

  it('returns 20 pre-loaded Live Activity Popups, restricts Support Agent from IP/Dossier (Part 3 #1), and delivers Admin direct messages with Audit + Dossier record (Part 5)', async () => {
    const popupRes = await request(app).get('/api/v1/live-popups');
    expect(popupRes.status).toBe(200);
    expect(popupRes.body.data.items.length).toBeGreaterThanOrEqual(20);

    // Part 3 #1: SUPPORT_AGENT must be blocked from full IP Users list & full Financial Dossier
    const ipResSupport = await request(app)
      .get('/api/v1/admin/users/ip-groups')
      .set('Authorization', `Bearer ${supportToken}`);
    expect(ipResSupport.status).toBe(403);

    const dossierResSupport = await request(app)
      .get(`/api/v1/admin/users/${userId}/financial-dossier`)
      .set('Authorization', `Bearer ${supportToken}`);
    expect(dossierResSupport.status).toBe(403);

    // Admin still has full IP Users list access
    const ipResAdmin = await request(app)
      .get('/api/v1/admin/users/ip-groups')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ipResAdmin.status).toBe(200);
    expect(Array.isArray(ipResAdmin.body.data)).toBe(true);

    // Part 5: Admin Direct Message with screenshot reaches member inbox, notifications, audit log, & dossier
    const dmSend = await request(app)
      .post(`/api/v1/admin/users/${userId}/message`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subject: 'Welcome Verification Notice',
        message: 'Hello from U-Ads Admin!',
        attachmentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        attachmentName: 'proof.png',
      });
    expect(dmSend.status).toBe(201);

    const dmInbox = await request(app)
      .get('/api/v1/messages')
      .set('Authorization', `Bearer ${userToken}`);
    expect(dmInbox.status).toBe(200);
    expect(dmInbox.body.data.length).toBeGreaterThanOrEqual(1);
    expect(dmInbox.body.data[0].message).toBe('Hello from U-Ads Admin!');
    expect(dmInbox.body.data[0].attachmentUrl).toBeTruthy();

    const dossierAfterDm = await request(app)
      .get(`/api/v1/admin/users/${userId}/financial-dossier`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dossierAfterDm.status).toBe(200);
    expect(dossierAfterDm.body.data.directMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('QA: accepts decimal USD strings ("50.00") on deposit submission (Part 5 #8)', async () => {
    const sampleProof =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const res = await request(app)
      .post('/api/v1/payments/deposit')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        paymentMethodId,
        amount: '50.00',
        currency: 'USD',
        transactionRef: `TX-DEC-${Date.now()}`,
        senderName: 'Test Isolation User',
        proofImageUrl: sampleProof,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.amountCents).toBe(5000);
  });

  it('QA: per-video percentage calculates on video base reward (NOT user deposits) & tier edit enforces access immediately (Part 3 #1 & Part 4 #2)', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/videos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: `QA Reward Pct Test ${Date.now()}`,
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        durationSeconds: 15,
        minPackageTier: 'Basic',
        minAccountLevel: 'LEVEL_2',
        rewardAmountCents: 100, // $1.00 base reward
        rewardPercentageBps: 5000, // 50% of $1.00 = $0.50 (50 cents), NOT 50% of deposits!
        isPublished: true,
      });
    expect(createRes.status).toBe(201);
    const createdVid = createRes.body.data;

    // User is on Basic (LEVEL_2) — must have access and see EXACTLY 50 cents ($0.50)
    const detail1 = await request(app)
      .get(`/api/v1/videos/${createdVid.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(detail1.status).toBe(200);
    expect(detail1.body.data.hasAccess).toBe(true);
    expect(detail1.body.data.effectiveRewardCents).toBe(50);

    // Admin raises minPackageTier to VIP while sending stale minAccountLevel: 'LEVEL_2' -> must auto-sync to LEVEL_4 & lock immediately!
    const editRes = await request(app)
      .put(`/api/v1/admin/videos/${createdVid.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        minPackageTier: 'VIP',
        minAccountLevel: 'LEVEL_2',
      });
    expect(editRes.status).toBe(200);
    expect(editRes.body.data.minAccountLevel).toBe('LEVEL_4');

    const detail2 = await request(app)
      .get(`/api/v1/videos/${createdVid.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(detail2.status).toBe(200);
    expect(detail2.body.data.hasAccess).toBe(false);
    expect(detail2.body.data.videoUrl).toBe('');

    // Clean up test video
    await prisma.video.delete({ where: { id: createdVid.id } });
  });

  it('QA: anchors 24-hour cycle deterministically to 8:00 PM PKT (15:00 UTC), returns dossier proofs, & preserves profile fields', async () => {
    const { AccountLevelService } = await import('../services/accountLevel.service.js');
    // 14:59 UTC = 7:59 PM PKT (still previous day's 8 PM PKT cycle); 15:00 UTC = 8:00 PM PKT (new cycle!)
    const beforeCutoff = AccountLevelService.getDailyWindow(20, new Date('2026-11-26T14:59:59.000Z'));
    const afterCutoff = AccountLevelService.getDailyWindow(20, new Date('2026-11-26T15:00:00.000Z'));
    expect(beforeCutoff.cycleKey).toBe('2026-11-25-H20');
    expect(afterCutoff.cycleKey).toBe('2026-11-26-H20');
    expect(afterCutoff.windowStart.toISOString()).toBe('2026-11-26T15:00:00.000Z');
    expect(afterCutoff.windowEnd.toISOString()).toBe('2026-11-27T15:00:00.000Z');

    // User Financial Dossier returns deposit proofImageUrl & header metadata
    const dossierRes = await request(app)
      .get(`/api/v1/admin/users/${userId}/financial-dossier`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dossierRes.status).toBe(200);
    expect(dossierRes.body.data.deposits.length).toBeGreaterThanOrEqual(1);
    expect(dossierRes.body.data.deposits[0].proofImageUrl).toBeTruthy();

    // PATCH /auth/profile returns savedPayoutMethod & referredBy keys without wiping them
    const profRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ fullName: 'Test Isolation User QA' });
    expect(profRes.status).toBe(200);
    expect('savedPayoutMethod' in profRes.body.data.user).toBe(true);
    expect('referredBy' in profRes.body.data.user).toBe(true);
  });

  it('QA 27-Nov: repairs all 3 Company Certificates (valid XML SVG), persists two-theme system, & enforces scoped Support Agent summary', async () => {
    // Part 1 #4: All 3 certificates must have valid XML SVG with zero unescaped '&'
    const docsRes = await request(app).get('/api/v1/documents');
    expect(docsRes.status).toBe(200);
    expect(docsRes.body.data.length).toBeGreaterThanOrEqual(3);
    for (const doc of docsRes.body.data) {
      expect(doc.fileUrl).toBeTruthy();
      if (doc.fileUrl.startsWith('data:image/svg+xml')) {
        const decoded = decodeURIComponent(doc.fileUrl.split(',')[1] || '');
        expect(/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(decoded)).toBe(false);
      }
    }

    // Part 2: Super Admin default theme + per-member saved theme
    const setDefault = await request(app)
      .put('/api/v1/admin/default-theme')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ theme: 'green' });
    expect(setDefault.status).toBe(200);

    const themeCfg = await request(app).get('/api/v1/theme-config');
    expect(themeCfg.status).toBe(200);
    expect(themeCfg.body.data.defaultTheme).toBe('green');

    // Member picks 'orange' -> persisted independently to their account
    const memberTheme = await request(app)
      .patch('/api/v1/auth/theme')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ theme: 'orange' });
    expect(memberTheme.status).toBe(200);
    expect(memberTheme.body.data.preferredTheme).toBe('orange');

    // Reset admin default back to 'orange'
    await request(app)
      .put('/api/v1/admin/default-theme')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ theme: 'orange' });

    // Part 3 #1: Support Agent can read ONLY the chatting member's scoped summary
    const convoRes = await request(app)
      .post('/api/v1/support/conversations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});
    expect(convoRes.status).toBe(200);
    const convoId = convoRes.body.data.id;

    const summaryRes = await request(app)
      .get(`/api/v1/admin/support/conversations/${convoId}/member-summary`)
      .set('Authorization', `Bearer ${supportToken}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.activePackageName).toBe('Basic');
    expect(summaryRes.body.data.earnings).toBeDefined();
    expect(Array.isArray(summaryRes.body.data.recentActivity)).toBe(true);
  });

  it('QA 27-Nov: allows package upgrade from Withdrawable Earnings + Combined with clear breakdown & pays Daily 24h Referral Commission on referral ad earnings', async () => {
    // Part 4 #3: User currently holds Basic ($50) with $5.00 in USER_AVAILABLE. Credit $45.00 into USER_VIDEO_REWARDS so Combined covers $50 Premium upgrade!
    const vidAcct = await prisma.walletAccount.findFirst({
      where: { userId, accountType: 'USER_VIDEO_REWARDS', currency: 'USD' },
    });
    expect(vidAcct).toBeDefined();
    await prisma.walletAccount.update({
      where: { id: vidAcct!.id },
      data: { balanceCents: 4500 },
    });

    const pkgList = await request(app)
      .get('/api/v1/packages')
      .set('Authorization', `Bearer ${userToken}`);
    const premiumPkg = pkgList.body.data.find((p: any) => p.name === 'Premium');
    expect(premiumPkg).toBeDefined();
    expect(premiumPkg.upgradeDiffCents).toBe(5000); // $100 - $50 = $50

    const upgRes = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ packageId: premiumPkg.id, paymentSource: 'COMBINED' });
    expect(upgRes.status).toBe(200);
    expect(upgRes.body.data.paymentBreakdown.subscriptionCreditCents).toBe(500);
    expect(upgRes.body.data.paymentBreakdown.videoRewardsCents).toBe(4500);

    // Part 9: Per-ad reward on Packages page matches unlocked ads on GET /videos
    const vidsAfterUpgrade = await request(app)
      .get('/api/v1/videos')
      .set('Authorization', `Bearer ${userToken}`);
    const openVids = vidsAfterUpgrade.body.data.filter((v: any) => v.hasAccess && !v.rewardPercentageBps);
    expect(openVids.length).toBeGreaterThanOrEqual(5);
    for (const v of openVids) {
      expect(v.effectiveRewardCents).toBe(premiumPkg.perVideoRewardCents);
    }

    // Part 4 #1: Daily 24h Referral Commission on referral's daily ad earnings (NOT one-time purchase!)
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    const sponsorRefCode = meRes.body.data.user.referralCode;

    const childRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: `refchild-${Date.now()}@u-ads.com`,
        password: 'UAdsSecure2026!',
        fullName: 'Daily Ref Child',
        referralCode: sponsorRefCode,
      });
    expect(childRes.status).toBe(201);
    const childToken = childRes.body.data.token;
    const childId = childRes.body.data.user.id;

    // Credit $20 deposit credit & purchase Starter -> qualifies child, pays $0 one-time commission
    await prisma.walletAccount.updateMany({
      where: { userId: childId, accountType: 'USER_AVAILABLE', currency: 'USD' },
      data: { balanceCents: 2000 },
    });
    const childBuy = await request(app)
      .post('/api/v1/packages/purchase')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ packageId: starterPackageId, paymentSource: 'SUBSCRIPTION_CREDIT' });
    expect(childBuy.status).toBe(200);

    // Child watches & claims an ad today ($0.50 = 50 cents)
    const childVids = await request(app)
      .get('/api/v1/videos')
      .set('Authorization', `Bearer ${childToken}`);
    const firstUnlocked = childVids.body.data.find((v: any) => v.hasAccess);
    const sess = await request(app)
      .post(`/api/v1/videos/${firstUnlocked.id}/session`)
      .set('Authorization', `Bearer ${childToken}`);
    await prisma.videoSession.update({
      where: { sessionToken: sess.body.data.sessionToken },
      data: { completed: true, completedAt: new Date(), watchSeconds: firstUnlocked.durationSeconds },
    });
    const childClaim = await request(app)
      .post(`/api/v1/videos/${firstUnlocked.id}/claim-reward`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessionToken: sess.body.data.sessionToken });
    expect(childClaim.status).toBe(200);

    // Trigger daily referral commission settlement for current cycle -> sponsor receives 5% of child's ad earnings
    const settle1 = await request(app)
      .post('/api/v1/admin/referrals/settle-daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ useCurrentCycle: true });
    expect(settle1.status).toBe(200);
    expect(settle1.body.data.settledCount).toBeGreaterThanOrEqual(1);

    const sponsorSummary = await request(app)
      .get('/api/v1/referrals/summary')
      .set('Authorization', `Bearer ${userToken}`);
    expect(sponsorSummary.status).toBe(200);
    expect(sponsorSummary.body.data.dailyCommissionMode).toBe(true);
    expect(sponsorSummary.body.data.commissions.length).toBeGreaterThanOrEqual(1);

    // Running settlement again for the SAME cycle is strictly idempotent (no double-pay)
    const settle2 = await request(app)
      .post('/api/v1/admin/referrals/settle-daily')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ useCurrentCycle: true });
    expect(settle2.status).toBe(200);
    expect(settle2.body.data.settledCount).toBe(0);

    // Part 7: Claim survives simulated cycleKey update within same 24h cycle (never double-claims)
    await prisma.rewardClaim.updateMany({
      where: { userId: childId, videoId: firstUnlocked.id },
      data: { cycleKey: 'LEGACY-PRE-UPDATE-KEY' },
    });
    const doubleClaim = await request(app)
      .post(`/api/v1/videos/${firstUnlocked.id}/claim-reward`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ sessionToken: sess.body.data.sessionToken });
    expect(doubleClaim.status).toBe(400);
    expect(doubleClaim.body.error.code).toBe('ALREADY_CLAIMED');
  });
});
