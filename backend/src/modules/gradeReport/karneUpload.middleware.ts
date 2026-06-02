import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const EXCEL_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(config.upload.dir));
  },
  filename: (_req, _file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const isExcel = EXCEL_MIMETYPES.includes(_file.mimetype);
    const ext = isExcel ? (_file.originalname.endsWith('.xls') ? '.xls' : '.xlsx') : '.pdf';
    cb(null, `karne-${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf' || EXCEL_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Sadece PDF veya Excel (.xlsx, .xls) dosyası yüklenebilir.', 400) as any);
  }
};

export const karneUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSize },
});
