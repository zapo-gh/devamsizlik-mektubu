import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function main() {
  const source = process.argv[2];
  if (!source) fail('Kullanım: ts-node src/scripts/restoreDatabase.ts <yedek-dosyası>');

  const backupPath = path.resolve(source);
  if (!fs.existsSync(backupPath)) fail(`Yedek bulunamadı: ${backupPath}`);
  if (path.extname(backupPath).toLowerCase() !== '.db') fail('Yalnızca .db yedekleri kabul edilir.');

  const backupDb = new PrismaClient({
    datasources: { db: { url: `file:${backupPath.replace(/\\/g, '/')}` } },
  });

  try {
    const result = await backupDb.$queryRawUnsafe<Array<{ integrity_check: string }>>('PRAGMA integrity_check');
    if (result[0]?.integrity_check !== 'ok') fail('Yedek SQLite bütünlük kontrolünden geçemedi.');
    await backupDb.$disconnect();

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl?.startsWith('file:')) fail('Restore yalnızca SQLite DATABASE_URL ile desteklenir.');
    const liveDb = path.resolve(databaseUrl.slice(5));
    if (!fs.existsSync(liveDb)) fail(`Aktif veritabanı bulunamadı: ${liveDb}`);

    const rollbackPath = `${liveDb}.pre-restore-${Date.now()}.db`;
    fs.copyFileSync(liveDb, rollbackPath);
    try {
      fs.copyFileSync(backupPath, liveDb);
      console.log(`✅ Restore tamamlandı: ${backupPath}`);
      console.log(`↩️ Geri dönüş yedeği: ${rollbackPath}`);
    } catch (error) {
      fs.copyFileSync(rollbackPath, liveDb);
      throw error;
    }
  } finally {
    await backupDb.$disconnect().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error('❌ Restore başarısız:', error);
  process.exit(1);
});
