import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler.middleware';
import { config } from '../config';
import prisma from './prisma';

/** SQLite veritabanının tutarlı snapshot yedeklerini yönetir. */
export class BackupService {
  private static getBackupDir(): string {
    const backupDir = path.resolve(config.backup.dir);
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    return backupDir;
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

  private static cleanOldBackups(backupDir: string, retentionDays: number): void {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(backupDir).filter((f) => f.endsWith('.db'))) {
      const filePath = path.join(backupDir, name);
      try {
        if (fs.statSync(filePath).mtime.getTime() < cutoff) fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Eski yedek işlenemedi (${name}):`, err);
      }
    }
  }

  public static getBackupsList(): { name: string; date: Date; sizeStr: string }[] {
    const backupDir = this.getBackupDir();
    return fs.readdirSync(backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((f) => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          date: stats.mtime,
          sizeStr: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }
}
