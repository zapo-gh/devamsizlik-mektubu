import fs from 'fs/promises';
import path from 'path';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';

const SQLITE_PREFIX = 'file:';

function getSqliteDatabasePath(): string {
  const rawUrl = config.database.url;
  if (!rawUrl || !rawUrl.startsWith(SQLITE_PREFIX)) {
    throw new Error('Yedekleme yalnızca SQLite veritabanları için destekleniyor.');
  }

  const rawPath = rawUrl.slice(SQLITE_PREFIX.length).split('?')[0];
  if (!rawPath) {
    throw new Error('DATABASE_URL içinde SQLite dosya yolu bulunamadı.');
  }

  return path.resolve(rawPath);
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export interface BackupResult {
  fileName: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
}

export async function createDatabaseBackup(): Promise<BackupResult> {
  const source = getSqliteDatabasePath();
  const backupDir = path.resolve(config.backup.dir);

  await fs.mkdir(backupDir, { recursive: true });

  const fileName = `okuldesk-${timestamp()}.db`;
  const destination = path.resolve(backupDir, fileName);

  if (destination === source) {
    throw new Error('Yedek dosyası kaynak veritabanı ile aynı olamaz.');
  }

  // VACUUM INTO produces a consistent SQLite snapshot without requiring the
  // application to stop accepting requests first.
  const escapedDestination = destination.replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`VACUUM INTO '${escapedDestination}'`);

  const stat = await fs.stat(destination);
  if (!stat.isFile() || stat.size === 0) {
    await fs.rm(destination, { force: true });
    throw new Error('Oluşturulan yedek dosyası geçersiz veya boş.');
  }

  return {
    fileName,
    path: destination,
    sizeBytes: stat.size,
    createdAt: new Date().toISOString(),
  };
}

export async function listBackups(): Promise<Array<{
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}>> {
  const backupDir = path.resolve(config.backup.dir);
  await fs.mkdir(backupDir, { recursive: true });

  const entries = await fs.readdir(backupDir, { withFileTypes: true });
  const backups = [] as Array<{ fileName: string; sizeBytes: number; createdAt: string }>;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.db')) continue;
    const filePath = path.join(backupDir, entry.name);
    const stat = await fs.stat(filePath);
    backups.push({
      fileName: entry.name,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    });
  }

  return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function pruneOldBackups(): Promise<number> {
  const backups = await listBackups();
  const cutoff = Date.now() - config.backup.retentionDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  for (const backup of backups) {
    if (new Date(backup.createdAt).getTime() >= cutoff) continue;
    await fs.rm(path.join(path.resolve(config.backup.dir), backup.fileName), { force: true });
    removed += 1;
  }

  return removed;
}
