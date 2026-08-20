import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const compressImage = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file || !req.file.path) {
    return next();
  }

  // Only compress images
  if (!req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const originalPath = req.file.path;
    const tempPath = originalPath + '.tmp.jpeg';

    await sharp(originalPath)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 75 })
      .toFile(tempPath);

    // Replace original file with compressed file
    fs.unlinkSync(originalPath);
    fs.renameSync(tempPath, originalPath);

    next();
  } catch (error) {
    console.error('Resim sıkıştırma hatası:', error);
    next(); // Hata olsa bile orjinal dosyayla devam et
  }
};
