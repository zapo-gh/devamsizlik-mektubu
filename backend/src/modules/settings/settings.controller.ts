import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const updateSchema = z.object({
  schoolName: z.string().max(200).optional(),
  principalName: z.string().max(100).optional(),
  waTemplate1: z.string().optional(),
  waTemplate2: z.string().optional(),
  waTemplate3: z.string().optional(),
});

export class SettingsController {
  async get(_req: Request, res: Response, next: NextFunction) {
    try {
      const result = await settingsService.get();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateSchema.parse(req.body);
      const result = await settingsService.update(data);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async backup(_req: Request, res: Response, next: NextFunction) {
    try {
      const dbUrl: string = process.env.DATABASE_URL || '';
      // SQLite URL: "file:/path/to/database.db" or "file:./relative"
      const dbPath = dbUrl.replace(/^file:/, '');
      const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

      if (!resolvedPath.endsWith('.db') && !resolvedPath.endsWith('.sqlite')) {
        res.status(400).json({ success: false, message: 'Yedekleme yalnızca SQLite veritabanı için desteklenmektedir.' });
        return;
      }

      if (!fs.existsSync(resolvedPath)) {
        res.status(404).json({ success: false, message: 'Veritabanı dosyası bulunamadı.' });
        return;
      }

      const date = new Date().toISOString().slice(0, 10);
      const filename = `okuldesk-yedek-${date}.db`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      fs.createReadStream(resolvedPath).pipe(res);
    } catch (error) {
      next(error);
    }
  }
}

export const settingsController = new SettingsController();
