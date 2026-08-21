import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Windows AppData altında OkulDesk dizini
const userDataPath = path.resolve(
  process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'),
  'OkulDesk',
);

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'database.db').replace(/\\/g, '/');
const uploadsDir = path.join(userDataPath, 'uploads');
const backupsDir = path.join(userDataPath, 'backups');
for (const dir of [uploadsDir, backupsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getOrCreateJwtSecret(): string {
  const secretFile = path.join(userDataPath, '.jwt_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const secret = fs.readFileSync(secretFile, 'utf8').trim();
      if (secret && secret.length >= 32) return secret;
    }
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  } catch {
    return crypto.randomBytes(48).toString('hex');
  }
}

process.env.NODE_ENV = 'production';
process.env.PORT = '4000';
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.JWT_SECRET = getOrCreateJwtSecret();
process.env.JWT_EXPIRES_IN = '24h';
process.env.UPLOAD_DIR = uploadsDir;
process.env.BACKUP_DIR = backupsDir;
process.env.BACKUP_RETENTION_DAYS = '30';
process.env.WHATSAPP_AUTH_DIR = path.join(userDataPath, 'whatsapp-auth');
process.env.OTP_EXPIRY_MINUTES = '30';
process.env.OTP_MAX_ATTEMPTS = '3';

const { startServer } = require('./server');

console.log('🚀 [Tauri-Sidecar] OkulDesk backend başlatılıyor (Port: 4000)...');

try {
  console.log('🔄 [Tauri-Sidecar] Veritabanı şeması eşitleniyor (Prisma db push)...');
  const { execSync } = require('child_process');

  let prismaScript = path.resolve(__dirname, '../node_modules/prisma/build/index.js');
  if (!fs.existsSync(prismaScript)) {
    prismaScript = path.resolve(process.cwd(), 'node_modules/prisma/build/index.js');
  }

  if (fs.existsSync(prismaScript)) {
    execSync(`"${process.execPath}" "${prismaScript}" migrate deploy`, {
      env: process.env,
      stdio: 'inherit',
    });
    console.log('✅ [Tauri-Sidecar] Veritabanı şeması başarıyla güncellendi.');
  } else {
    console.warn('⚠️ [Tauri-Sidecar] Prisma CLI bulunamadı, şema eşitlemesi atlanıyor.');
  }
} catch (err: any) {
  console.error('❌ [Tauri-Sidecar] Veritabanı eşitleme hatası:', err.message);
}

startServer()
  .then(() => {
    console.log('✅ [Tauri-Sidecar] Backend hazır: http://127.0.0.1:4000');
  })
  .catch((err: any) => {
    console.error('❌ [Tauri-Sidecar] Backend başlatma hatası:', err);
    process.exit(1);
  });
