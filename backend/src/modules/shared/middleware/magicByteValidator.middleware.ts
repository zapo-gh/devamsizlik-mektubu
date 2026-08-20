import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { AppError } from './errorHandler.middleware';

export const validateMagicBytes = (allowedMimes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next(); // No file to validate
    }

    try {
      const FileType = require('file-type');
      let fileTypeResult;
      
      if (req.file.buffer) {
        fileTypeResult = await FileType.fromBuffer(req.file.buffer);
      } else if (req.file.path) {
        fileTypeResult = await FileType.fromFile(req.file.path);
      }
      
      if (!fileTypeResult) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return next(new AppError('Geçersiz dosya içeriği veya tanınmayan format.', 400));
      }

      // Check against allowed mimes
      if (!allowedMimes.includes(fileTypeResult.mime)) {
        if (req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return next(new AppError('Geçersiz dosya türü tespit edildi. Lütfen geçerli bir dosya yükleyin.', 400));
      }

      next();
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      next(new AppError('Dosya doğrulama hatası.', 500));
    }
  };
};
