const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user...');

  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) {
    console.log('ℹ️  Admin kullanıcısı zaten var, atlanıyor.');
    return;
  }

  // Güvenli rastgele şifre üret — asla hardcoded şifre kullanma
  const rawPassword = crypto.randomBytes(10).toString('base64url');
  const adminPassword = await bcrypt.hash(rawPassword, 12);
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });
  console.log(`✅ Admin kullanıcısı oluşturuldu: ${admin.username}`);
  console.log(`🔑 İlk giriş şifresi: ${rawPassword}`);
  console.log('⚠️  Bu şifreyi not alın ve ilk girişten sonra değiştirin.');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
