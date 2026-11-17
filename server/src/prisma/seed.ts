import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting VistaraX Database Seeding ---');

  // 1. Create System Wallet Accounts for Double-Entry Ledger
  const systemAccounts = [
    { accountType: 'SYSTEM_CASH_EASYPAISA', currency: 'PKR' },
    { accountType: 'SYSTEM_CASH_JAZZCASH', currency: 'PKR' },
    { accountType: 'SYSTEM_CASH_CRYPTO', currency: 'USD' },
    { accountType: 'SYSTEM_REVENUE_PACKAGES', currency: 'USD' },
    { accountType: 'SYSTEM_REVENUE_PACKAGES', currency: 'PKR' },
    { accountType: 'SYSTEM_EXPENSE_REWARDS', currency: 'USD' },
    { accountType: 'SYSTEM_EXPENSE_REWARDS', currency: 'PKR' },
    { accountType: 'SYSTEM_EXPENSE_REFERRALS', currency: 'USD' },
    { accountType: 'SYSTEM_EXPENSE_REFERRALS', currency: 'PKR' },
  ];

  for (const acc of systemAccounts) {
    const existing = await prisma.walletAccount.findFirst({
      where: { userId: null, accountType: acc.accountType, currency: acc.currency },
    });
    if (!existing) {
      await prisma.walletAccount.create({
        data: {
          userId: null,
          accountType: acc.accountType,
          currency: acc.currency,
          balanceCents: 0,
        },
      });
    }
  }
  console.log('✔ System ledger accounts verified.');

  // 2. Seed Users across all 5 RBAC roles
  const defaultPasswordHash = await bcrypt.hash('VistaraSecure2026!', 10);
  const innovativeAdminHash = await bcrypt.hash('Super@2026', 10);

  const users = [
    {
      email: 'admin@innovative.online',
      fullName: 'Innovative Super Admin',
      role: 'SUPER_ADMIN',
      referralCode: 'INNOVATIVE-SUPER',
      customHash: innovativeAdminHash,
    },
    {
      email: 'admin@vistarax.com',
      fullName: 'Alexander Vance (Super Admin)',
      role: 'SUPER_ADMIN',
      referralCode: 'VISTARA-SUPER',
      customHash: defaultPasswordHash,
    },
    {
      email: 'finance@vistarax.com',
      fullName: 'Sarah Chen (Finance Admin)',
      role: 'FINANCE_ADMIN',
      referralCode: 'VISTARA-FIN',
      customHash: defaultPasswordHash,
    },
    {
      email: 'content@vistarax.com',
      fullName: 'Marcus Brody (Content Admin)',
      role: 'CONTENT_ADMIN',
      referralCode: 'VISTARA-CONT',
      customHash: defaultPasswordHash,
    },
    {
      email: 'support@vistarax.com',
      fullName: 'Elena Rostova (Support Agent)',
      role: 'SUPPORT_AGENT',
      referralCode: 'VISTARA-SUPP',
      customHash: defaultPasswordHash,
    },
    {
      email: 'user@vistarax.com',
      fullName: 'David Sterling (Active Member)',
      role: 'USER',
      referralCode: 'VISTARA-DEMO',
      customHash: defaultPasswordHash,
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const createdUser = await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          passwordHash: u.customHash,
          role: u.role,
          status: 'ACTIVE',
          emailVerified: true,
          referralCode: u.referralCode,
        },
      });

      // Initialize USD and PKR available, reserved, and referral accounts for each user
      for (const cur of ['USD', 'PKR']) {
        await prisma.walletAccount.createMany({
          data: [
            { userId: createdUser.id, accountType: 'USER_AVAILABLE', currency: cur, balanceCents: 0 },
            { userId: createdUser.id, accountType: 'USER_RESERVED', currency: cur, balanceCents: 0 },
            { userId: createdUser.id, accountType: 'USER_REFERRAL', currency: cur, balanceCents: 0 },
          ],
        });
      }
    }
  }
  console.log('✔ RBAC users & user wallet accounts initialized.');

  // 3. Seed Configurable Packages (Phase 5)
  const packages = [
    {
      name: 'Starter',
      priceCents: 2000, // $20.00
      currency: 'USD',
      videoLimit: 2,
      badge: 'Essential',
      description: 'Ideal starting tier for exploring introductory masterclasses.',
      features: JSON.stringify([
        'Access to 2 curated HD masterclasses',
        'Interactive playback session tracking',
        'Community discussion board access',
        'Standard customer support',
      ]),
    },
    {
      name: 'Basic',
      priceCents: 5000, // $50.00
      currency: 'USD',
      videoLimit: 6,
      badge: 'Popular',
      description: 'Expanded access for active learners and emerging creators.',
      features: JSON.stringify([
        'Access to 6 specialized masterclasses',
        'Priority stream quality (1080p 60fps)',
        'Eligible for milestone engagement rewards',
        'Standard referral commission program',
        'Priority ticketing support',
      ]),
    },
    {
      name: 'Premium',
      priceCents: 10000, // $100.00
      currency: 'USD',
      videoLimit: 15,
      badge: 'Best Value',
      description: 'Comprehensive curriculum for serious practitioners and professionals.',
      features: JSON.stringify([
        'Access to 15 advanced curriculum masterclasses',
        'Full 4K Ultra HD streaming capability',
        'Verified course completion certificates',
        'Enhanced referral commission tier',
        'Dedicated account representative',
      ]),
    },
    {
      name: 'VIP',
      priceCents: 50000, // $500.00
      currency: 'USD',
      videoLimit: 60,
      badge: 'All-Inclusive',
      description: 'Unrestricted full-catalog access to all 60 masterclasses and private workshops.',
      features: JSON.stringify([
        'Full 60-video masterclass library access',
        'Exclusive behind-the-scenes architectural breakdowns',
        'Direct live Q&A session access with guest speakers',
        'Maximum referral tier benefits',
        '24/7 dedicated VIP concierge support',
      ]),
    },
  ];

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg,
    });
  }
  console.log('✔ Packages (Starter, Basic, Premium, VIP) seeded.');

  // 4. Seed Payment Methods (Phase 8)
  const paymentMethods = [
    {
      code: 'EASYPAISA',
      name: 'EasyPaisa Instant Transfer',
      currency: 'PKR',
      accountTitle: 'VistaraX Media Treasury',
      accountNumber: '0345-8899123',
      instructions: 'Send payment to the registered EasyPaisa account number and submit your 3737 transaction ID reference.',
      minAmountCents: 100000, // 1,000 PKR
      maxAmountCents: 20000000, // 200,000 PKR
    },
    {
      code: 'JAZZCASH',
      name: 'JazzCash Official Wallet',
      currency: 'PKR',
      accountTitle: 'VistaraX Operations PK',
      accountNumber: '0300-7766554',
      instructions: 'Transfer funds via JazzCash app or mobile account and upload the 8558 confirmation SMS reference.',
      minAmountCents: 100000,
      maxAmountCents: 20000000,
    },
    {
      code: 'CRYPTO_USDT',
      name: 'USDT (TRC-20 Network)',
      currency: 'USD',
      accountTitle: 'VistaraX Corporate Custody',
      accountNumber: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      instructions: 'Send exact USDT on TRC-20 network only. Provide your 64-character transaction hash (TxID) for fast audit.',
      minAmountCents: 2000, // $20.00
      maxAmountCents: 5000000, // $50,000.00
    },
    {
      code: 'BANK_TRANSFER',
      name: 'Standard Chartered Direct Wire',
      currency: 'PKR',
      accountTitle: 'VistaraX Global Technologies Ltd',
      accountNumber: '01-1234567-01 (IBAN: PK65SCBL0000001123456701)',
      instructions: 'Transfer via online banking IBFT and include your registered user ID in the transaction remarks.',
      minAmountCents: 500000, // 5,000 PKR
      maxAmountCents: 50000000,
    },
  ];

  for (const pm of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { code: pm.code },
      update: pm,
      create: pm,
    });
  }
  console.log('✔ Payment methods (EasyPaisa, JazzCash, USDT, Bank Wire) seeded.');

  // 5. Seed Initial 10 Masterclass Videos (Section 4.1: Expandable by Admin)
  const initialVideos = [
    {
      title: 'Foundations of Modern Digital Systems',
      description: 'Core concepts of distributed web systems, API gateways, and asynchronous workflows.',
      category: 'AI & Systems Architecture',
      tier: 'Starter',
      duration: 900,
      rewardCents: 50,
      thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Cloud Infrastructure & Microservices',
      description: 'Architecting resilient containerized deployments with horizontal auto-scaling and monitoring.',
      category: 'AI & Systems Architecture',
      tier: 'Starter',
      duration: 1080,
      rewardCents: 50,
      thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Financial Ledgering & Double-Entry Principles',
      description: 'Immutable bookkeeping, balance sheet invariant verification, and audit-compliant reporting.',
      category: 'Quantitative Finance & Ledgering',
      tier: 'Basic',
      duration: 1200,
      rewardCents: 75,
      thumbnail: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Full-Stack Performance Optimization & Caching',
      description: 'Advanced caching strategies, query indexing, and frontend rendering pipeline tuning.',
      category: 'Full-Stack Software Engineering',
      tier: 'Basic',
      duration: 1320,
      rewardCents: 75,
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Protocol Engineering & State Validation',
      description: 'Idempotency patterns, distributed state consensus, and cryptographic message signing.',
      category: 'Full-Stack Software Engineering',
      tier: 'Basic',
      duration: 1440,
      rewardCents: 75,
      thumbnail: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Quantitative Risk Modeling & Capital Allocations',
      description: 'Mathematical frameworks for portfolio risk management, drawdown mitigation, and stress testing.',
      category: 'Quantitative Finance & Ledgering',
      tier: 'Premium',
      duration: 1500,
      rewardCents: 100,
      thumbnail: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Enterprise Threat Modeling & Zero-Trust Defense',
      description: 'Defense-in-depth methodologies, credential isolation, and proactive incident response.',
      category: 'Cybersecurity & Cryptography',
      tier: 'Premium',
      duration: 1680,
      rewardCents: 100,
      thumbnail: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'High-Throughput Data Streaming & Event Pipelines',
      description: 'Kafka and pub/sub patterns for processing millions of telemetry events in real time.',
      category: 'Venture Creation & Scaling',
      tier: 'Premium',
      duration: 1800,
      rewardCents: 100,
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Strategic Venture Architecture & Institutional Governance',
      description: 'Structuring international corporate entities, regulatory compliance, and investor reporting.',
      category: 'Executive Leadership & Strategy',
      tier: 'VIP',
      duration: 1920,
      rewardCents: 150,
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    },
    {
      title: 'Global Growth Scaling & Executive Strategy',
      description: 'Organizational design, international expansion frameworks, and multi-market leadership.',
      category: 'Executive Leadership & Strategy',
      tier: 'VIP',
      duration: 2100,
      rewardCents: 150,
      thumbnail: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const existingVideosCount = await prisma.video.count();
  if (existingVideosCount === 0) {
    let idx = 1;
    for (const v of initialVideos) {
      await prisma.video.create({
        data: {
          title: v.title,
          description: v.description,
          thumbnailUrl: v.thumbnail,
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          durationSeconds: v.duration,
          category: v.category,
          minPackageTier: v.tier,
          orderIndex: idx,
          isPublished: true,
          rewardEligible: true,
          rewardAmountCents: v.rewardCents,
        },
      });
      idx++;
    }
    console.log(`✔ Initial 10 masterclass videos seeded successfully.`);
  } else {
    console.log(`✔ Video library already initialized with ${existingVideosCount} videos.`);
  }

  // 6. Seed System Settings & Initial Exchange Rate
  await prisma.exchangeRateRecord.create({
    data: {
      baseCurrency: 'USD',
      targetCurrency: 'PKR',
      rate: 280.0,
    },
  });

  const settings = [
    { key: 'COMMISSION_PERCENT', value: '5.0', description: 'Default verified net-revenue referral commission percentage' },
    { key: 'REWARDS_ENABLED', value: 'true', description: 'Enable or disable playback reward claims' },
    { key: 'COMMISSIONS_ENABLED', value: 'true', description: 'Enable or disable referral commissions' },
    { key: 'MAINTENANCE_MODE', value: 'false', description: 'Emergency maintenance mode toggle' },
    { key: 'MIN_WITHDRAWAL_USD_CENTS', value: '1000', description: 'Minimum withdrawal for USD ($10.00)' },
    { key: 'MIN_WITHDRAWAL_PKR_CENTS', value: '100000', description: 'Minimum withdrawal for PKR (1,000 PKR)' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: s,
      create: s,
    });
  }
  console.log('✔ System settings & exchange rate verified.');

  console.log('--- VistaraX Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
