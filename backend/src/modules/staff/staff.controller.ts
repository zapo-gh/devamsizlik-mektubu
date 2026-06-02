import { Request, Response, NextFunction } from 'express';
import { staffService, ROLE_LABELS, StaffRole } from './staff.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(2, 'Ad en az 2 karakter olmalıdır.').max(100),
  role: z.enum(['MUDUR_YARDIMCISI', 'REHBER_OGRETMEN', 'SINIF_REHBER_OGRETMEN']),
  className: z.string().max(50).optional(),
});

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  className: z.string().max(50).optional(),
  isActive: z.boolean().optional(),
});

export class StaffController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const role = req.query.role as string | undefined;
      const list = await staffService.getAll(role);
      res.json({ success: true, data: { staff: list, roleLabels: ROLE_LABELS } });
    } catch (e) { next(e); }
  }

  async getByClass(req: Request, res: Response, next: NextFunction) {
    try {
      const className = decodeURIComponent(req.params.className);
      const teacher = await staffService.getByClass(className);
      res.json({ success: true, data: teacher });
    } catch (e) { next(e); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);
      const record = await staffService.create(parsed.data as { name: string; role: StaffRole; className?: string });
      res.status(201).json({ success: true, data: record });
    } catch (e) { next(e); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);
      const record = await staffService.update(req.params.id, parsed.data);
      res.json({ success: true, data: record });
    } catch (e) { next(e); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await staffService.delete(req.params.id);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}

export const staffController = new StaffController();
