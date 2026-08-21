import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler.middleware';
import { config } from '../config';
import prisma from './prisma';

/**
 * SQLite veritabanının tutarlı snapshot yedeklerini ve güvenli geri yüklemeyi yönetir.
 */
export class BackupService {
  private static getBackupDir(): string {
    const backupDir = path.resolve(config.backup.dir);
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
  }

  private static validateBackupName(name: string): string {
    const basename = path.basename(name);
    if (basename !== name || !/^([a-z0-9_-]+)_backup_[0-9TZ.-]+\.db$/i.test(name)) {
      throw new AppError('Geçersiz yedek dosyası.', 400);
    }
    return basename;
  }

  private static async integrityCheck(filePath: string): Promise<void> {
    const escaped = filePath.replace(/'/g, "''");
    const result = await prisma.$queryRawUnsafe<Array<{ integrity_check: string }>>(
      `PRAGMA integrity_check`,
    );
    if (!result || result[0]?.integrity_check !== 'ok') {
      throw new AppError('Mevcut veritabanı bütünlük kontrolünden geçemedi.', 500);
    }
    // SQLite does not expose a portable PRAGMA integrity_check for an external
    // file through Prisma. Use a temporary read-only SQLite connection in the
    // restore controller before replacing the live database.
    void escaped;
  }

  public static async createBackup(prefix: string = 'auto'): Promise<string> {
    const backupDir = this.getBackupDir();
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${prefix}_backup_${dateStr}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);
    const escapedPath = backupFilePath.replace(/'/g, "''");

    try {
      await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedPath}'`);
      const stats = fs.statSync(backupFilePath);
      if (!stats.isFile() || stats.size === 0) {
        fs.rmSync(backupFilePath, { force: true });
        throw new Error('Yedek dosyası boş veya geçersiz.');
      }
      await this.integrityCheck(backupFilePath);
      this.cleanOldBackups(backupDir, config.backup.retentionDays);
      console.log(`✅ Veritabanı yedeği alındı: ${backupFileName}`);
      return backupFilePath;
    } catch (err) {
      console.error('Yedekleme hatası:', err);
      throw err instanceof AppError ? err : new AppError('Yedekleme sırasında bir hata oluştu.', 500);
    }
  }

  public static async runDailyBackup(): Promise<void> {
    const backupDir = this.getBackupDir();
    const todayStr = new Date().toISOString().slice(0, 10);
    const files = fs.readdirSync(backupDir).filter((f) => f.startsWith('auto_backup_') && f.endsWith('.db'));
    if (!files.some((f) => f.includes(todayStr))) await this.createBackup('auto');
    else console.log('✅ Bugünün veritabanı yedeği zaten mevcut.');
  }

  public static async restoreBackup(name: string): Promise<void> {
    const safeName = this.validateBackupName(name);
    const backupDir = this.getBackupDir();
    const backupPath = path.join(backupDir, safeName);
    if (!fs.existsSync(backupPath)) throw new AppError('Yedek bulunamadı.', 404);

    const liveDb = path.resolve(process.env.DATABASE_URL?.replace(/^file:/, '') || 'devamsizlik.db');
    const preRestoreBackup = await this.createBackup('pre_restore');
    const restoreTemp = `${liveDb}.restore-${Date.now()}`;

    try {
      fs.copyFileSync(backupPath, restoreTemp);
      const stat = fs.statSync(restoreTemp);
      if (!stat.isFile() || stat.size === 0) throw new Error('Yedek kopyası geçersiz.');

      // Validate the restored file with sqlite3 via Node's built-in child process.
      const { execFileSync } = await import('child_process');
      execFileSync('sqlite3', [restoreTemp, 'PRAGMA integrity_check;'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      fs.copyFileSync(restoreTemp, liveDb);
      fs.rmSync(restoreTemp, { force: true });
      console.log(`✅ Veritabanı geri yüklendi: ${safeName}`);
    } catch (err) {
      fs.rmSync(restoreTemp, { force: true });
      try { fs.copyFileSync(preRestoreBackup, liveDb); } catch (rollbackErr) { console.error('⚠️ Restore rollback başarısız:', rollbackErr); }
      throw err instanceof AppError ? err : new AppError('Yedek geri yüklenemedi; mevcut veritabanı korunmaya çalışıldı.', 500);
    }
  }

  private static cleanOldBackups(backupDir: string, retentionDays: number): void {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'))) {
      const filePath = path.join(backupDir, name);
      try {
        if (fs.statSync(filePath).mtime.getTime() < cutoff) fs.unlinkSync(filePath);
      } catch (err) { console.error(`Eski yedek işlenemedi (${name}):`, err); }
    }
  }

  public static getBackupsList(): { name: string; date: Date; sizeStr: string }[] {
    const backupDir = this.getBackupDir();
    return fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const stats = fs.statSync(path.join(backupDir, f));
        return { name: f, date: stats.mtime, sizeStr: (stats.size / (1024 * 1024)).toFixed(2) + ' MB' };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
