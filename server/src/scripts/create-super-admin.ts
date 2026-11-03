import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@innovative.online';
  const password = 'Super@2026';
  const fullName = 'Innovative Super Admin';
  const role = 'SUPER_ADMIN';

  console.log(`Setting up Super Admin for: ${email}`);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      status: 'ACTIVE',
      emailVerified: true,
      fullName,
    },
    create: {
      email,
      fullName,
      passwordHash,
      role,
      status: 'ACTIVE',
      emailVerified: true,
      referralCode: 'INNOVATIVE-SUPER',
    },
  });

  // Ensure wallet accounts exist
  for (const cur of ['USD', 'PKR']) {
    for (const accType of ['USER_AVAILABLE', 'USER_RESERVED']) {
      const exists = await prisma.walletAccount.findFirst({
        where: { userId: user.id, accountType: accType, currency: cur },
      });
      if (!exists) {
        await prisma.walletAccount.create({
          data: {
            userId: user.id,
            accountType: accType,
            currency: cur,
            balanceCents: 0,
          },
        });
      }
    }
  }

  console.log(`✅ Super Admin created/updated successfully!`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role:     ${user.role}`);
}

main()
  .catch((e) => {
    console.error('Error creating super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
