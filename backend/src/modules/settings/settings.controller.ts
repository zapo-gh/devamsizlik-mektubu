import { Request, Response, NextFunction } from 'express';
import { settingsService } from './settings.service';
import { z } from 'zod';

const updateSchema = z.object({
  schoolName: z.string().max(200).optional(),
  principalName: z.string().max(100).optional(),
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
}

export const settingsController = new SettingsController();
