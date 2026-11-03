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
  const passwordHash = await bcrypt.hash('VistaraSecure2026!', 10);

  const users = [
    {
      email: 'admin@vistarax.com',
      fullName: 'Alexander Vance (Super Admin)',
      role: 'SUPER_ADMIN',
      referralCode: 'VISTARA-SUPER',
    },
    {
      email: 'finance@vistarax.com',
      fullName: 'Sarah Chen (Finance Admin)',
      role: 'FINANCE_ADMIN',
      referralCode: 'VISTARA-FIN',
    },
    {
      email: 'content@vistarax.com',
      fullName: 'Marcus Brody (Content Admin)',
      role: 'CONTENT_ADMIN',
      referralCode: 'VISTARA-CONT',
    },
    {
      email: 'support@vistarax.com',
      fullName: 'Elena Rostova (Support Agent)',
      role: 'SUPPORT_AGENT',
      referralCode: 'VISTARA-SUPP',
    },
    {
      email: 'user@vistarax.com',
      fullName: 'David Sterling (Active Member)',
      role: 'USER',
      referralCode: 'VISTARA-DEMO',
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const createdUser = await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          passwordHash,
          role: u.role,
          status: 'ACTIVE',
          emailVerified: true,
          referralCode: u.referralCode,
        },
      });

      // Initialize USD and PKR available and reserved accounts for each user
      for (const cur of ['USD', 'PKR']) {
        await prisma.walletAccount.createMany({
          data: [
            { userId: createdUser.id, accountType: 'USER_AVAILABLE', currency: cur, balanceCents: 0 },
            { userId: createdUser.id, accountType: 'USER_RESERVED', currency: cur, balanceCents: 0 },
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

  // 5. Seed 60 Videos across 6 categories (Phase 6)
  const categories = [
    { name: 'AI & Systems Architecture', count: 10, tier: 'Starter' },
    { name: 'Quantitative Finance & Ledgering', count: 10, tier: 'Basic' },
    { name: 'Full-Stack Software Engineering', count: 10, tier: 'Basic' },
    { name: 'Venture Creation & Scaling', count: 10, tier: 'Premium' },
    { name: 'Cybersecurity & Cryptography', count: 10, tier: 'Premium' },
    { name: 'Executive Leadership & Strategy', count: 10, tier: 'VIP' },
  ];

  const existingVideosCount = await prisma.video.count();
  if (existingVideosCount < 60) {
    let globalIndex = 1;
    for (const cat of categories) {
      for (let i = 1; i <= cat.count; i++) {
        const title = `${cat.name}: Masterclass Vol. ${i}`;
        const description = `In-depth exploration of core principles, production architectures, case studies, and advanced strategies in ${cat.name}. Module ${i} of ${cat.count}.`;
        const durationSeconds = 900 + (globalIndex * 45) % 1800; // between 15 and 45 minutes
        
        await prisma.video.create({
          data: {
            title,
            description,
            thumbnailUrl: `https://images.unsplash.com/photo-${1518770660439 + globalIndex * 1234}?auto=format&fit=crop&w=800&q=80`,
            videoUrl: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`,
            durationSeconds,
            category: cat.name,
            minPackageTier: cat.tier,
            orderIndex: globalIndex,
            isPublished: true,
            rewardEligible: true,
            rewardAmountCents: 50, // $0.50 reward
          },
        });
        globalIndex++;
      }
    }
  }
  console.log(`✔ Video library verified with 60 catalog items.`);

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
