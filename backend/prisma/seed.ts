import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data for clean baseline
  await prisma.refreshToken.deleteMany({});
  await prisma.user.deleteMany({});

  const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
  const managerPasswordHash = await bcrypt.hash('ManagerPass123!', 10);
  const userPasswordHash = await bcrypt.hash('UserPass123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      permissions: JSON.stringify([]),
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      name: 'Operations Manager',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
      permissions: JSON.stringify([]),
    },
  });

  const member = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Standard User',
      passwordHash: userPasswordHash,
      role: 'USER',
      permissions: JSON.stringify([]),
    },
  });

  console.log('✅ Seed completed successfully:');
  console.log(`   👑 Admin:   ${admin.email} / AdminPass123! [Role: ${admin.role}]`);
  console.log(`   🛡️ Manager: ${manager.email} / ManagerPass123! [Role: ${manager.role}]`);
  console.log(`   👤 User:    ${member.email} / UserPass123! [Role: ${member.role}]`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
