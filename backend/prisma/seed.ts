import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin user created: ${admin.username}`);

  // Create sample students
  const student1 = await prisma.student.upsert({
    where: { schoolNumber: '1001' },
    update: {},
    create: {
      schoolNumber: '1001',
      fullName: 'Ahmet Yılmaz',
      className: '9-A',
    },
  });

  const student2 = await prisma.student.upsert({
    where: { schoolNumber: '1002' },
    update: {},
    create: {
      schoolNumber: '1002',
      fullName: 'Ayşe Demir',
      className: '10-B',
    },
  });

  const student3 = await prisma.student.upsert({
    where: { schoolNumber: '1003' },
    update: {},
    create: {
      schoolNumber: '1003',
      fullName: 'Mehmet Kaya',
      className: '11-C',
    },
  });

  console.log(`✅ Sample students created: ${student1.fullName}, ${student2.fullName}, ${student3.fullName}`);

  // Create sample parent
  const parentPassword = await bcrypt.hash('veli123', 12);
  const parentUser = await prisma.user.upsert({
    where: { username: 'veli1' },
    update: {},
    create: {
      username: 'veli1',
      password: parentPassword,
      role: 'PARENT',
    },
  });

  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      fullName: 'Ali Yılmaz',
      phone: '905551234567',
      students: {
        connect: { id: student1.id },
      },
    },
  });

  console.log(`✅ Sample parent created: ${parent.fullName}`);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
