const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

async function testBackup() {
  const backupPath = path.resolve(__dirname, 'backup_test.db');
  try {
    const fs = require('fs');
    if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
    }
    await prisma.$executeRawUnsafe(`VACUUM INTO '${backupPath}'`);
    console.log('Backup successful to', backupPath);
  } catch (err) {
    console.error('Backup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

testBackup();
