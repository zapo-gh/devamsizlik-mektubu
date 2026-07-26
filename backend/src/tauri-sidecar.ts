import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Windows AppData altında OkulDesk dizini
const userDataPath = path.resolve(
  process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'),
  'OkulDesk'
);

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'database.db').replace(/\\/g, '/');
const uploadsDir = path.join(userDataPath, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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

// ÖNCE process.env değişkenleri tanımlanmalı (modül içe aktarılmadan önce!)
process.env.NODE_ENV = 'production';
process.env.PORT = '4000';
process.env.DATABASE_URL = `file:${dbPath}`;
process.env.JWT_SECRET = getOrCreateJwtSecret();
process.env.JWT_EXPIRES_IN = '24h';
process.env.UPLOAD_DIR = uploadsDir;
process.env.WHATSAPP_AUTH_DIR = path.join(userDataPath, 'whatsapp-auth');
process.env.OTP_EXPIRY_MINUTES = '30';
process.env.OTP_MAX_ATTEMPTS = '3';

// ÖNEMLİ: server.js YALNIZCA process.env atandıktan SONRA require ile yüklenmeli
const { startServer } = require('./server');

console.log('🚀 [Tauri-Sidecar] OkulDesk backend başlatılıyor (Port: 4000)...');
startServer()
  .then(() => {
    console.log('✅ [Tauri-Sidecar] Backend hazır: http://127.0.0.1:4000');
  })
  .catch((err: any) => {
    console.error('❌ [Tauri-Sidecar] Backend başlatma hatası:', err);
    process.exit(1);
  });
