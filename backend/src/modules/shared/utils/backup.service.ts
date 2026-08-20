import fs from 'fs';
import path from 'path';
import { AppError } from '../middleware/errorHandler.middleware';
import prisma from './prisma';

/**
 * Veritabanının düzenli olarak yedeklenmesini sağlayan servis.
 */
export class BackupService {
  private static getBackupDir(): string {
    const userDataPath = path.resolve(
      process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'),
      'OkulDesk'
    );
    const backupDir = path.join(userDataPath, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    return backupDir;
  }

  /**
   * Manuel veya otomatik veritabanı yedeği alır.
   * SQLite WAL modunda çalıştığı için en güvenli yedekleme yöntemi VACUUM INTO'dur.
   */
  public static async createBackup(prefix: string = 'auto'): Promise<string> {
    const backupDir = this.getBackupDir();
    
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${prefix}_backup_${dateStr}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);

    try {
      // VACUUM INTO ile veritabanının anlık, tutarlı bir kopyasını oluştur (WAL vs dinlemez, güvenlidir)
      await prisma.$executeRawUnsafe(`VACUUM INTO '${backupFilePath}'`);
      
      // Eski otomatik yedekleri temizle (Son 7 yedeği tut)
      if (prefix === 'auto') {
        this.cleanOldBackups(backupDir, 'auto', 7);
      }

      console.log(`✅ Otomatik veritabanı yedeği alındı: ${backupFileName}`);
      return backupFilePath;
    } catch (err) {
      console.error('Yedekleme hatası:', err);
      throw new AppError('Yedekleme sırasında bir hata oluştu.', 500);
    }
  }

  /**
   * Günde sadece 1 kez otomatik yedek alınmasını sağlar.
   */
  public static async runDailyBackup(): Promise<void> {
    const backupDir = this.getBackupDir();
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    const files = fs.readdirSync(backupDir).filter(f => f.startsWith('auto_backup_'));
    const hasBackupToday = files.some(f => f.includes(todayStr));
    
    if (!hasBackupToday) {
      console.log('🔄 Bugün için otomatik yedek bulunamadı, oluşturuluyor...');
      await this.createBackup('auto');
    } else {
      console.log('✅ Bugünün veritabanı yedeği zaten mevcut.');
    }
  }

  /**
   * Belirtilen dizindeki eski yedekleri siler (en güncel maxKeep adedi tutar).
   */
  private static cleanOldBackups(backupDir: string, prefix: string, maxKeep: number): void {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith(`${prefix}_backup_`) && f.endsWith('.db'))
      .map(f => ({ name: f, path: path.join(backupDir, f), time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // Yeni -> Eski sıralaması

    if (files.length > maxKeep) {
      const filesToDelete = files.slice(maxKeep);
      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
          console.log(`🗑️ Eski yedek silindi: ${file.name}`);
        } catch (err) {
          console.error(`Eski yedek silinemedi (${file.name}):`, err);
        }
      }
    }
  }

  /**
   * Mevcut yedeklerin listesini döndürür.
   */
  public static getBackupsList(): { name: string; date: Date; sizeStr: string }[] {
    const backupDir = this.getBackupDir();
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stats = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          date: stats.mtime,
          sizeStr: (stats.size / (1024 * 1024)).toFixed(2) + ' MB'
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return files;
  }
}
