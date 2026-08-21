import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function requireSeedPassword(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 10) {
    throw new Error(`${name} zorunludur ve en az 10 karakter olmalıdır.`);
  }
  return value;
}

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash(requireSeedPassword('SEED_ADMIN_PASSWORD'), 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });
  console.log(`✅ Admin user ready: ${admin.username}`);

  const student1 = await prisma.student.upsert({
    where: { schoolNumber: '1001' },
    update: {},
    create: { schoolNumber: '1001', fullName: 'Ahmet Yılmaz', className: '9-A' },
  });

  const student2 = await prisma.student.upsert({
    where: { schoolNumber: '1002' },
    update: {},
    create: { schoolNumber: '1002', fullName: 'Ayşe Demir', className: '10-B' },
  });

  const student3 = await prisma.student.upsert({
    where: { schoolNumber: '1003' },
    update: {},
    create: { schoolNumber: '1003', fullName: 'Mehmet Kaya', className: '11-C' },
  });

  console.log(`✅ Sample students ready: ${student1.fullName}, ${student2.fullName}, ${student3.fullName}`);

  const parentPassword = await bcrypt.hash(requireSeedPassword('SEED_PARENT_PASSWORD'), 12);
  const parentUser = await prisma.user.upsert({
    where: { username: 'veli1' },
    update: {},
    create: {
      username: 'veli1',
      password: parentPassword,
      role: 'PARENT',
      mustChangePassword: true,
    },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      fullName: 'Ali Yılmaz',
      phone: '905551234567',
      students: { connect: { id: student1.id } },
    },
  });

  console.log(`✅ Sample parent ready: ${parent.fullName}`);
  console.log('🎉 Seeding completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
