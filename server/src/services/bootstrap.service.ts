import prisma from '../lib/prisma.js';
import { AccountLevelService } from './accountLevel.service.js';
import { CompanyDocumentService } from './companyDocument.service.js';

export const DEFAULT_REFERRAL_CONFIG = {
  minQualifyingUSD: 20,
  commissionRates: {
    pos1: 5,
    pos2: 7,
    pos3: 10,
    pos4: 12,
    pos5: 15,
    range6to10: 15,
    range11to100: 15,
    range101to500: 15,
    range501Plus: 15,
  },
  ranks: [
    { key: 'NEW', name: 'New', minQualified: 0, maxQualified: 0, milestoneAt: 0, milestoneRewardUSD: 0 },
    { key: 'GOLD', name: 'Gold', minQualified: 1, maxQualified: 5, milestoneAt: 5, milestoneRewardUSD: 20 },
    { key: 'PLATINUM', name: 'Platinum', minQualified: 6, maxQualified: 10, milestoneAt: 10, milestoneRewardUSD: 100 },
    { key: 'DIAMOND', name: 'Diamond', minQualified: 11, maxQualified: 100, milestoneAt: 100, milestoneRewardUSD: 500 },
    { key: 'RANK_4', name: 'Rank 4', minQualified: 101, maxQualified: 500, milestoneAt: 500, milestoneRewardUSD: 1000 },
    { key: 'RANK_5', name: 'Rank 5', minQualified: 501, maxQualified: 10000, milestoneAt: 1000, milestoneRewardUSD: 2500 },
  ],
};

export const DEFAULT_BONUS_SETTINGS = {
  accountLevelBonus: {
    enabled: true,
    eligibility: 'Active unlocked accounts at Level 1 or higher',
    rewardPoolUSD: 50000,
    schedule: 'Daily Batch',
    creditTimeUTC: '00:00 UTC',
  },
  videoBonus: {
    enabled: true,
    defaultRewardCents: 50,
    eligibility: '100% verified playback completion (1 reward per video)',
    rewardPoolUSD: 25000,
    schedule: 'Instant upon Completion',
    creditTimeUTC: 'Instant',
  },
  referralBonus: {
    enabled: true,
    eligibility: 'Referred user first qualifying transaction only',
    rewardPoolUSD: 50000,
    schedule: 'Instant upon Qualification',
    creditTimeUTC: 'Instant',
  },
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  registration: true,
  depositSubmitted: true,
  depositApproved: true,
  depositRejected: true,
  videoCompleted: true,
  rewardCredited: true,
  referralQualified: true,
  rankMilestone: true,
  withdrawalLifecycle: true,
  supportReplies: true,
  supportEscalations: true,
};

export const DEFAULT_LANDING_CONTENT = {
  badgeText: 'U-Ads • Verified Video Campaigns & USD Rewards',
  heroTitle: 'Watch Verified Campaigns & Earn Real USD Rewards',
  heroHighlight: '',
  heroSubtitle:
    'Access curated digital media campaigns on U-Ads. Complete verified full-duration sessions, grow your referral rank, and manage everything in USD with a transparent double-entry ledger.',
  videoPreviewHeading: 'Featured Video Preview',
  videoPreviewSubtitle:
    'Explore active campaigns in the catalog. Unlock higher video limits as your account level and plan advance.',
  rewardsHeading: 'Transparent Rewards & Bonus Structure',
  rewardsSubtitle:
    'Three distinct USD reward streams tracked cleanly across your Main, Video Rewards, and Referral wallets.',
  contactHeading: 'Contact & 24/7 Customer Support',
  contactSubtitle:
    'Need help with deposits, account levels, or payouts? Our support team responds directly through live chat and email.',
  contactEmail: 'support@u-ads.com',
  contactPhone: '+1 (800) 555-0194',
  contactHours: '24/7 Live Support • Deposit Verification: 10–30 Minutes',
  contactAddress: 'U-Ads Digital Operations Center, Suite 400',
};

export class BootstrapService {
  static async ensurePlatformDefaults() {
    // 1. System USD Wallet Accounts
    const systemAccounts = [
      'SYSTEM_CASH_CRYPTO',
      'SYSTEM_CASH_EASYPAISA',
      'SYSTEM_CASH_JAZZCASH',
      'SYSTEM_REVENUE_PACKAGES',
      'SYSTEM_EXPENSE_REWARDS',
      'SYSTEM_EXPENSE_REFERRALS',
      'SYSTEM_ADJUSTMENT',
    ];

    for (const accType of systemAccounts) {
      const exists = await prisma.walletAccount.findFirst({
        where: { userId: null, accountType: accType, currency: 'USD' },
      });
      if (!exists) {
        await prisma.walletAccount.create({
          data: {
            userId: null,
            accountType: accType,
            currency: 'USD',
            balanceCents: 0,
          },
        });
      }
    }

    // 2. Backfill missing memberCodes for existing users
    const usersWithoutCode = await prisma.user.findMany({
      where: { memberCode: null },
      select: { id: true },
    });
    for (const u of usersWithoutCode) {
      const code = `UAD-${u.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`;
      await prisma.user.update({
        where: { id: u.id },
        data: { memberCode: code },
      }).catch(() => {});
    }

    // 3. Ensure Payment Channels (USD Only) — always upsert both defaults
    const defaultMethods = [
      {
        code: 'CRYPTO_USDT',
        name: 'USDT (TRC-20 Network)',
        currency: 'USD',
        accountTitle: 'U-Ads Treasury Custody (TRC-20)',
        accountNumber: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
        instructions:
          'Send exact USDT (TRC-20) amount to the wallet address above, then submit your 64-character TxHash / Reference ID and receipt screenshot. Verified within 10–30 minutes.',
        minAmountCents: 2000, // $20.00
        maxAmountCents: 5000000, // $50,000.00
        isActive: true,
      },
      {
        code: 'USD_BANK_WIRE',
        name: 'USD International Bank / Wire Transfer',
        currency: 'USD',
        accountTitle: 'U-Ads Digital Operations LLC',
        accountNumber: 'ACCT-9048112200 (SWIFT: CHASUS33)',
        instructions:
          'Transfer USD via bank wire / ACH and upload your bank confirmation receipt along with the transaction reference number.',
        minAmountCents: 2000,
        maxAmountCents: 5000000,
        isActive: true,
      },
    ];
    for (const pm of defaultMethods) {
      await prisma.paymentMethod.upsert({
        where: { code: pm.code },
        update: {},            // keep any admin edits intact; just ensure they exist
        create: pm,
      });
    }
    // Deactivate any non-USD legacy channels
    await prisma.paymentMethod.updateMany({
      where: { currency: { not: 'USD' } },
      data: { isActive: false },
    });

    // 4. Ensure 4 Default Packages (USD Only)
    const pkgCount = await prisma.package.count();
    if (pkgCount === 0) {
      const packages = [
        {
          name: 'Starter',
          priceCents: 2000,
          currency: 'USD',
          videoLimit: 2,
          badge: 'Essential',
          description: 'Entry tier unlocking 2 verified video campaigns and rewards.',
          features: JSON.stringify([
            'Access to 2 curated video campaigns',
            'Automatic server-verified reward credits',
            'USD Wallet & immutable ledger access',
            '24/7 customer support desk',
          ]),
          isActive: true,
        },
        {
          name: 'Basic',
          priceCents: 5000,
          currency: 'USD',
          videoLimit: 6,
          badge: 'Popular',
          description: 'Expanded catalog access for active members.',
          features: JSON.stringify([
            'Access to 6 curated video campaigns',
            'Eligible for Level & Video engagement rewards',
            'Full referral commission & rank eligibility',
            'Priority live support queue',
          ]),
          isActive: true,
        },
        {
          name: 'Premium',
          priceCents: 10000,
          currency: 'USD',
          videoLimit: 15,
          badge: 'Best Value',
          description: 'Professional tier with 15 video slots and milestone progression.',
          features: JSON.stringify([
            'Access to 15 high-reward video campaigns',
            'Higher daily level bonus eligibility',
            'Gold & Platinum referral milestone fast-track',
            'Dedicated account support',
          ]),
          isActive: true,
        },
        {
          name: 'VIP',
          priceCents: 50000,
          currency: 'USD',
          videoLimit: 60,
          badge: 'All-Inclusive',
          description: 'Maximum unrestricted access across the video library.',
          features: JSON.stringify([
            'Access up to 60 video campaigns',
            'Maximum referral & milestone tier access',
            'Priority withdrawal settlement review',
            '24/7 VIP support desk',
          ]),
          isActive: true,
        },
      ];
      for (const pkg of packages) {
        await prisma.package.upsert({
          where: { name: pkg.name },
          update: pkg,
          create: pkg,
        });
      }
    }

    // 5. Ensure Initial 10 Videos (using verified HTTP 200 public MP4 streams)
    const verifiedMp4Streams = [
      { url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', dur: 52 },
      { url: 'https://media.w3.org/2010/05/bunny/trailer.mp4', dur: 33 },
      { url: 'https://vjs.zencdn.net/v/oceans.mp4', dur: 46 },
      { url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4', dur: 13 },
      { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', dur: 5 },
      { url: 'https://media.w3.org/2010/05/sintel/trailer.mp4', dur: 52 },
      { url: 'https://media.w3.org/2010/05/bunny/trailer.mp4', dur: 33 },
      { url: 'https://vjs.zencdn.net/v/oceans.mp4', dur: 46 },
      { url: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4', dur: 13 },
      { url: 'https://media.w3.org/2010/05/bunny/trailer.mp4', dur: 33 },
    ];

    const videoCount = await prisma.video.count();
    if (videoCount === 0) {
      const initialVideos = [
        {
          title: 'Global Digital Advertising Fundamentals',
          description: 'Introduction to programmatic media buying, impressions, and brand safety verification.',
          category: 'AI & Systems Architecture',
          minPackageTier: 'Starter',
          durationSeconds: verifiedMp4Streams[0].dur,
          rewardAmountCents: 50,
          thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[0].url,
        },
        {
          title: 'Audience Telemetry & Engagement Metrics',
          description: 'Understanding verified viewer retention, heartbeat validation, and ad completion quality.',
          category: 'AI & Systems Architecture',
          minPackageTier: 'Starter',
          durationSeconds: verifiedMp4Streams[1].dur,
          rewardAmountCents: 50,
          thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[1].url,
        },
        {
          title: 'Double-Entry Treasury & Financial Auditing',
          description: 'How institutional digital platforms keep balanced debits, credits, and payout reserves.',
          category: 'Quantitative Finance & Ledgering',
          minPackageTier: 'Basic',
          durationSeconds: verifiedMp4Streams[2].dur,
          rewardAmountCents: 75,
          thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[2].url,
        },
        {
          title: 'High-Conversion Video Creative Strategy',
          description: 'Designing engaging 15-to-60 second video campaigns that maximize brand recall.',
          category: 'Full-Stack Software Engineering',
          minPackageTier: 'Basic',
          durationSeconds: verifiedMp4Streams[3].dur,
          rewardAmountCents: 75,
          thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[3].url,
        },
        {
          title: 'Cross-Border USD Digital Settlement Rails',
          description: 'Modern stablecoin and wire verification workflows for transparent digital operations.',
          category: 'Full-Stack Software Engineering',
          minPackageTier: 'Basic',
          durationSeconds: verifiedMp4Streams[4].dur,
          rewardAmountCents: 75,
          thumbnailUrl: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[4].url,
        },
        {
          title: 'Brand Risk Protection & Fraud Prevention',
          description: 'Detecting non-human traffic, replay tampering, and invalid session claims in real time.',
          category: 'Cybersecurity & Cryptography',
          minPackageTier: 'Premium',
          durationSeconds: verifiedMp4Streams[5].dur,
          rewardAmountCents: 100,
          thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[5].url,
        },
        {
          title: 'Quantitative Performance Attribution',
          description: 'Measuring campaign ROI, position-based affiliate attribution, and cohort retention.',
          category: 'Quantitative Finance & Ledgering',
          minPackageTier: 'Premium',
          durationSeconds: verifiedMp4Streams[6].dur,
          rewardAmountCents: 100,
          thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[6].url,
        },
        {
          title: 'Scaling Multi-Region Digital Networks',
          description: 'Building resilient cloud delivery pipelines for global media distribution.',
          category: 'Venture Creation & Scaling',
          minPackageTier: 'Premium',
          durationSeconds: verifiedMp4Streams[7].dur,
          rewardAmountCents: 100,
          thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[7].url,
        },
        {
          title: 'Enterprise Governance & Regulatory Compliance',
          description: 'Operational transparency, audit logging, and strict separation of financial duties.',
          category: 'Executive Leadership & Strategy',
          minPackageTier: 'VIP',
          durationSeconds: verifiedMp4Streams[8].dur,
          rewardAmountCents: 150,
          thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[8].url,
        },
        {
          title: 'Strategic Media Leadership & Growth',
          description: 'Executive playbook for sustaining creator ecosystems and enterprise sponsor partnerships.',
          category: 'Executive Leadership & Strategy',
          minPackageTier: 'VIP',
          durationSeconds: verifiedMp4Streams[9].dur,
          rewardAmountCents: 150,
          thumbnailUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
          videoUrl: verifiedMp4Streams[9].url,
        },
      ];

      let idx = 1;
      for (const v of initialVideos) {
        await prisma.video.create({
          data: {
            ...v,
            orderIndex: idx,
            isPublished: true,
            rewardEligible: true,
          },
        });
        idx++;
      }
    } else {
      // Auto-repair any existing seeded videos pointing to the deprecated 403 Google gtv-videos-bucket
      const brokenVideos = await prisma.video.findMany({
        where: { videoUrl: { contains: 'commondatastorage.googleapis.com/gtv-videos-bucket' } },
        orderBy: { orderIndex: 'asc' },
      });
      for (let i = 0; i < brokenVideos.length; i++) {
        const replacement = verifiedMp4Streams[i % verifiedMp4Streams.length];
        await prisma.video.update({
          where: { id: brokenVideos[i].id },
          data: {
            videoUrl: replacement.url,
            durationSeconds: replacement.dur,
          },
        });
      }
    }

    // 6. Account Levels & Official Company Documents
    await AccountLevelService.ensureDefaultLevels();
    await CompanyDocumentService.ensureInitialDocuments();

    // 7. System Config Defaults (USD Only, Referral Config, Bonus Settings, Notifications, Landing CMS)
    const defaultJsonSettings: Array<{ key: string; value: string; description: string }> = [
      {
        key: 'REWARDS_ENABLED',
        value: 'true',
        description: 'Enable or disable video completion engagement rewards',
      },
      {
        key: 'COMMISSIONS_ENABLED',
        value: 'true',
        description: 'Enable or disable affiliate referral commissions',
      },
      {
        key: 'MAINTENANCE_MODE',
        value: 'false',
        description: 'Emergency platform maintenance mode toggle',
      },
      {
        key: 'MIN_WITHDRAWAL_USD_CENTS',
        value: '1000',
        description: 'Minimum withdrawal threshold in USD cents ($10.00)',
      },
      {
        key: 'DEPOSIT_VERIFICATION_TIME_TEXT',
        value: '10–30 minutes',
        description: 'Standard deposit verification turnaround displayed platform-wide',
      },
      {
        key: 'SUPPORT_REASSIGN_TIMEOUT_SECONDS',
        value: '180',
        description: 'Auto-reassign support chat if assigned agent does not reply within timeout',
      },
      {
        key: 'REFERRAL_CONFIG',
        value: JSON.stringify(DEFAULT_REFERRAL_CONFIG),
        description: 'Configurable referral rank ranges, position commission rates, milestones, and minimum qualifying transaction USD',
      },
      {
        key: 'BONUS_SETTINGS',
        value: JSON.stringify(DEFAULT_BONUS_SETTINGS),
        description: 'Configurable Account/Level Bonus, Video Bonus, and Referral Bonus policies',
      },
      {
        key: 'NOTIFICATION_SETTINGS',
        value: JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS),
        description: 'Toggle in-app notifications per platform event',
      },
      {
        key: 'LANDING_CONTENT',
        value: JSON.stringify(DEFAULT_LANDING_CONTENT),
        description: 'Editable landing page hero, video preview, rewards, and contact section content',
      },
    ];

    for (const s of defaultJsonSettings) {
      const existing = await prisma.systemSetting.findUnique({ where: { key: s.key } });
      if (!existing) {
        await prisma.systemSetting.create({ data: s });
      } else if (s.key === 'LANDING_CONTENT') {
        try {
          const parsed = JSON.parse(existing.value || '{}');
          if (
            typeof parsed.heroTitle === 'string' &&
            parsed.heroTitle.trim().endsWith('&') &&
            !parsed.heroHighlight
          ) {
            parsed.heroTitle = 'Watch Verified Campaigns & Earn Real USD Rewards';
            await prisma.systemSetting.update({
              where: { key: s.key },
              data: { value: JSON.stringify(parsed) },
            });
          }
        } catch {
          // ignore malformed json
        }
      }
    }

    // 8. Clean any legacy VistaraX strings in stored support messages
    const legacyMsgs = await prisma.supportMessage.findMany({
      where: {
        OR: [
          { message: { contains: 'VistaraX' } },
          { senderName: { contains: 'VistaraX' } },
        ],
      },
      select: { id: true, message: true, senderName: true },
    });
    for (const m of legacyMsgs) {
      await prisma.supportMessage.update({
        where: { id: m.id },
        data: {
          message: m.message.replace(/VistaraX/gi, 'U-Ads'),
          senderName: m.senderName.replace(/VistaraX/gi, 'U-Ads'),
        },
      }).catch(() => {});
    }
  }
}
