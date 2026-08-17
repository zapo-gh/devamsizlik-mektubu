import { Request, Response, NextFunction } from 'express';
import { holidayService } from './holiday.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const createSchema = z.object({
  name: z.string().min(1), startDate: z.string().min(1), endDate: z.string().min(1),
  academicYear: z.string().min(1), isRecurring: z.boolean().optional(),

  extraData: z.string().optional(),
});

export class HolidayController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const ay = (req.query.academicYear as string) || '2025-2026';
      await holidayService.seedDefaults(ay);
      res.json({ success: true, data: await holidayService.getAll(ay) });
    } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const p = createSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      res.status(201).json({ success: true, data: await holidayService.create(p.data) });
    } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try { await holidayService.update(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction) {
    try { await holidayService.delete(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
}

export const holidayController = new HolidayController();
