const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = 'file:C:/Users/Q/AppData/Roaming/OkulDesk/database.db';
const prisma = new PrismaClient();

async function main() {
  // Tören Geç Kalma ihlalleriyle ilişkili uyarıları bul
  // Bu uyarılar, behaviorCode=DEVAMSIZLIK_OZURSUZ ve
  // description'ında "Tören Geç Kalma" geçenler
  const rows = await prisma.writtenWarning.findMany({
    where: {
      behaviorCode: 'DEVAMSIZLIK_OZURSUZ',
      description: { contains: 'Tören Geç Kalma' }
    },
    include: { student: { select: { fullName: true, className: true } } }
  });

  console.log('Düzeltilecek kayıt sayısı:', rows.length);
  rows.forEach(r => console.log(' -', r.student.fullName, r.student.className, '|', r.description));

  if (rows.length === 0) {
    console.log('Düzeltilecek kayıt yok.');
    await prisma.$disconnect();
    return;
  }

  const ids = rows.map(r => r.id);
  const result = await prisma.writtenWarning.updateMany({
    where: { id: { in: ids } },
    data: { behaviorCode: 'M164_1_F' }
  });

  console.log('Güncellenen kayıt sayısı:', result.count);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
