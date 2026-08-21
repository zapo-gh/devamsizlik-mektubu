import * as http from 'http';
import app from './app';
import { config } from './modules/shared/config';
import prisma from './modules/shared/utils/prisma';
import { initializeDatabase } from './modules/shared/utils/initDb';
import * as whatsappService from './modules/whatsapp/whatsapp.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as net from 'net';
import { BackupService } from './modules/shared/utils/backup.service';

let httpServer: http.Server | null = null;

async function seedAdmin(): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (existing) {
    // Mevcut admin hesabına asla dokunma — kullanıcının değiştirdiği şifre korunur.
    return null;
  }

  // Never ship or print a static administrator credential. The first-run UI can
  // receive the generated password through the existing adminInitialized event.
  const initialPassword = process.env.INITIAL_ADMIN_PASSWORD || crypto.randomBytes(18).toString('base64url');
  const adminPassword = await bcrypt.hash(initialPassword, 12);

  await prisma.user.create({
    data: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      mustChangePassword: true,
    },
  });

  console.log('✅ İlk yönetici hesabı oluşturuldu; ilk girişte şifre değişikliği zorunlu.');
  return initialPassword;
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
 */
export async function startServer(): Promise<void> {
  if (await isPortBusy(config.port)) {
    throw new Error(
      `Port ${config.port} başka bir uygulama tarafından kullanılıyor.\n` +
      `Lütfen programın önceki bir örneğinin kapalı olduğundan emin olun.`
    );
  }

  await initializeDatabase();
  console.log('✅ Veritabanı şeması hazır');

  const initialAdminPassword = await seedAdmin();

  await prisma.$connect();
  console.log('✅ Database connected successfully');

  await BackupService.runDailyBackup().catch((err: unknown) => {
    console.error('⚠️ Otomatik yedekleme başarısız oldu:', err);
  });

  await new Promise<void>((resolve, reject) => {
    httpServer = app.listen(config.port, '127.0.0.1', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📋 Environment: ${config.nodeEnv}`);
      resolve();
    });
    httpServer.on('error', reject);
  });

  if (initialAdminPassword) {
    (process as any).emit('adminInitialized', initialAdminPassword);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`\n${signal} alındı, kapatılıyor...`);

  await new Promise<void>((resolve) => {
    if (httpServer) {
      httpServer.close(() => resolve());
    } else {
      resolve();
    }
  });

  await whatsappService.disconnect().catch(() => {});
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
