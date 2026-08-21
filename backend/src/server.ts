import * as http from 'http';
import app from './app';
import { config } from './modules/shared/config';
import prisma from './modules/shared/utils/prisma';
import { initializeDatabase } from './modules/shared/utils/initDb';
import * as whatsappService from './modules/whatsapp/whatsapp.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { BackupService } from './modules/shared/utils/backup.service';

let httpServer: http.Server | null = null;

async function seedAdmin(): Promise<string | null> {
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (existing) {
    return null;
  }

  // Never ship a static administrator credential. Generate a one-time password
  // on first launch and store it in the user-data directory for local retrieval.
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

  const userDataPath = path.resolve(
    process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'),
    'OkulDesk',
  );
  fs.mkdirSync(userDataPath, { recursive: true });
  const credentialsFile = path.join(userDataPath, 'initial-admin-credentials.txt');
  fs.writeFileSync(
    credentialsFile,
    `OkulDesk ilk yönetici hesabı\n\nKullanıcı adı: admin\nGeçici şifre: ${initialPassword}\n\nGüvenlik için ilk girişten sonra bu dosyayı silin.\n`,
    { encoding: 'utf8', mode: 0o600 },
  );

  console.log(`✅ İlk yönetici hesabı oluşturuldu. Geçici kimlik bilgileri: ${credentialsFile}`);
  return initialPassword;
}

function isPortBusy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(true))
      .once('listening', () => { tester.close(); resolve(false); })
      .listen(port, '127.0.0.1');
  });
}

export async function startServer(): Promise<void> {
  if (await isPortBusy(config.port)) {
    throw new Error(
      `Port ${config.port} başka bir uygulama tarafından kullanılıyor.\n` +
      `Lütfen programın önceki bir örneğinin kapalı olduğundan emin olun.`,
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
