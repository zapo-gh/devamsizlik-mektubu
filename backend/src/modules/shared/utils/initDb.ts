import prisma from './prisma';

/**
 * Veritabanı başlangıç ayarları.
 * Tüm tablo oluşturma işlemleri schema.prisma ve Prisma CLI'ye (db push/migrate) devredilmiştir.
 */
export async function initializeDatabase(): Promise<void> {
  // Performans ve veri bütünlüğü için SQLite PRAGMA'larını aktif et
  await prisma.$queryRawUnsafe(`PRAGMA journal_mode=WAL`);
  await prisma.$queryRawUnsafe(`PRAGMA foreign_keys=ON`);
  
  console.log('✅ SQLite PRAGMA ayarları uygulandı (WAL, FK=ON)');
}
