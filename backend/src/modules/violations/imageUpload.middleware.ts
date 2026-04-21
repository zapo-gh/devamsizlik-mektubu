import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';

// violations/ alt klasörüne kaydet
const violationsDir = path.resolve(config.upload.dir, 'violations');
if (!fs.existsSync(violationsDir)) {
  fs.mkdirSync(violationsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, violationsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `violation-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Sadece JPG, PNG ve WebP fotoğraflar yüklenebilir.', 400) as any);
  }
};

export const violationImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB (fotoğraflar büyük olabilir)
  },
});
