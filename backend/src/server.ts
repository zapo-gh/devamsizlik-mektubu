import * as http from 'http';
import app from './app';
import { config } from './modules/shared/config';
import prisma from './modules/shared/utils/prisma';
import { initializeDatabase } from './modules/shared/utils/initDb';
import * as whatsappService from './modules/whatsapp/whatsapp.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as net from 'net';

let httpServer: http.Server | null = null;

async function seedAdmin(): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (existing) return null; // Zaten varsa dokunma

  // İlk çalıştırma: güvenli rastgele şifre üret
  const rawPassword = crypto.randomBytes(8).toString('base64url'); // ~11 karakter, URL-güvenli
  const adminPassword = await bcrypt.hash(rawPassword, 12);
  await prisma.user.create({
    data: { username: 'admin', password: adminPassword, role: 'ADMIN', mustChangePassword: true },
  });
  console.log('✅ Admin kullanıcısı oluşturuldu');
  return rawPassword; // Yalnızca ilk çalıştırmada dön
}

/** Belirtilen portun kullanımda olup olmadığını kontrol eder */
function isPortBusy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => { tester.close(); resolve(false); })
      .listen(port, '127.0.0.1');
  });
}

/**
 * Sunucuyu başlatır ve dinlemeye hazır olduğunda resolve eder.
 * Electron'un main.js'i bu fonksiyonu await ile çağırır.
 */
export async function startServer(): Promise<void> {
  // Port kullanımda mı?
  if (await isPortBusy(config.port)) {
    throw new Error(
      `Port ${config.port} başka bir uygulama tarafından kullanılıyor.\n` +
      `Lütfen programın önceki bir örneğinin kapalı olduğundan emin olun.`
    );
  }

  // SQLite tablolarını oluştur
  await initializeDatabase();
  console.log('✅ Veritabanı şeması hazır');

  // Admin kullanıcısını ekle (sadece ilk çalıştırmada oluşturur)
  const initialAdminPassword = await seedAdmin();

  // Veritabanı bağlantısını test et
  await prisma.$connect();
  console.log('✅ Database connected successfully');

  // Sunucuyu başlat — listen callback'i resolve ettikten sonra dön
  await new Promise<void>((resolve, reject) => {
    httpServer = app.listen(config.port, '127.0.0.1', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📋 Environment: ${config.nodeEnv}`);
      resolve();
    });
    httpServer.on('error', reject);
  });

  // İlk çalıştırmada şifreyi Electron ana sürecine ilet
  if (initialAdminPassword) {
    (process as any).emit('adminInitialized', initialAdminPassword);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} alındı, kapatılıyor...`);

  // 1. Yeni HTTP istekleri almayı durdur
  await new Promise<void>((resolve) => {
    if (httpServer) {
      httpServer.close(() => resolve());
    } else {
      resolve();
    }
  });

  // 2. WhatsApp bağlantısını kapat
  await whatsappService.disconnect().catch(() => {});

  // 3. Veritabanı bağlantısını kapat
  await prisma.$disconnect();

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

