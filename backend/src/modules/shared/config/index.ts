import dotenv from 'dotenv';
dotenv.config();

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parsePositiveInt(process.env.PORT, 4000),

  database: {
    url: process.env.DATABASE_URL!,
  },

  jwt: {
    secret: (() => {
      const s = process.env.JWT_SECRET;
      if (!s || s.length < 32) throw new Error('JWT_SECRET ortam değişkeni ayarlanmamış veya çok kısa (min 32 karakter).');
      return s;
    })(),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parsePositiveInt(process.env.UPLOAD_MAX_SIZE, 10 * 1024 * 1024),
  },

  backup: {
    dir: process.env.BACKUP_DIR || './backups',
    retentionDays: parsePositiveInt(process.env.BACKUP_RETENTION_DAYS, 30),
  },

  frontendDomain: process.env.FRONTEND_DOMAIN || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
