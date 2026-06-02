import dotenv from 'dotenv';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

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
    maxSize: 10 * 1024 * 1024, // 10MB
  },

  frontendDomain: process.env.FRONTEND_DOMAIN || 'http://localhost:5173',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
