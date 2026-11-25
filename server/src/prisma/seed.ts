import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BootstrapService } from '../services/bootstrap.service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting U-Ads Database Seeding ---');

  // 1. Seed Users across all 5 RBAC roles (USD Only)
  const defaultPasswordHash = await bcrypt.hash('UAdsSecure2026!', 10);
  const innovativeAdminHash = await bcrypt.hash('Super@2026', 10);

  const users = [
    {
      email: 'admin@innovative.online',
      fullName: 'Innovative Super Admin',
      role: 'SUPER_ADMIN',
      referralCode: 'INNOVATIVE-SUPER',
      memberCode: 'UAD-ADMIN01',
      customHash: innovativeAdminHash,
    },
    {
      email: 'finance@u-ads.com',
      fullName: 'Finance Administrator',
      role: 'FINANCE_ADMIN',
      referralCode: 'UADS-FIN',
      memberCode: 'UAD-FIN001',
      customHash: defaultPasswordHash,
    },
    {
      email: 'content@u-ads.com',
      fullName: 'Content Administrator',
      role: 'CONTENT_ADMIN',
      referralCode: 'UADS-CONT',
      memberCode: 'UAD-CNT001',
      customHash: defaultPasswordHash,
    },
    {
      email: 'support@u-ads.com',
      fullName: 'Senior Support Agent',
      role: 'SUPPORT_AGENT',
      referralCode: 'UADS-SUPP',
      memberCode: 'UAD-SUP001',
      customHash: defaultPasswordHash,
    },
    {
      email: 'user@u-ads.com',
      fullName: 'Demo Member',
      role: 'USER',
      referralCode: 'UADS-DEMO',
      memberCode: 'UAD-USR001',
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
          memberCode: u.memberCode,
        },
      });

      await prisma.walletAccount.createMany({
        data: [
          { userId: createdUser.id, accountType: 'USER_AVAILABLE', currency: 'USD', balanceCents: 0 },
          { userId: createdUser.id, accountType: 'USER_VIDEO_REWARDS', currency: 'USD', balanceCents: 0 },
          { userId: createdUser.id, accountType: 'USER_OTHER_REWARDS', currency: 'USD', balanceCents: 0 },
          { userId: createdUser.id, accountType: 'USER_RESERVED', currency: 'USD', balanceCents: 0 },
          { userId: createdUser.id, accountType: 'USER_REFERRAL', currency: 'USD', balanceCents: 0 },
        ],
      });
    }
  }
  console.log('✔ RBAC users & USD wallet accounts initialized.');

  // 2. Bootstrap all platform defaults (Channels, Packages, 10 Videos, Levels, Referral/Bonus/Landing Configs)
  await BootstrapService.ensurePlatformDefaults();
  console.log('✔ U-Ads Database Seeding Completed Successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
