const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dbPath = path.resolve(process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'), 'OkulDesk', 'database.db');
const prisma = new PrismaClient({ datasources: { db: { url: 'file:' + dbPath } } });
async function main() {
  const schema = await prisma.$queryRawUnsafe('SELECT sql FROM sqlite_master WHERE type=\'table\' AND name=\'Holiday\'');
  console.log('Schema:', schema);
}
main().catch(console.error).finally(() => prisma.$disconnect());
