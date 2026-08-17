import { Request, Response, NextFunction } from 'express';
import { commissionService } from './commission.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const createSchema = z.object({
  name: z.string().min(1), description: z.string().optional(),
  academicYear: z.string().min(1), sortOrder: z.number().optional(),

  extraData: z.string().optional(),
});

export class CommissionController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const ay = (req.query.academicYear as string) || '2025-2026';
      res.json({ success: true, data: await commissionService.getAll(ay) });
    } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const p = createSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      res.status(201).json({ success: true, data: await commissionService.create(p.data) });
    } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try { await commissionService.update(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction) {
    try { await commissionService.delete(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async addRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { commissionId, roleName, sortOrder } = req.body;
      if (!commissionId || !roleName) throw new AppError('Komisyon ID ve rol adı gerekli.', 400);
      res.status(201).json({ success: true, data: await commissionService.addRole({ commissionId, roleName, sortOrder }) });
    } catch (e) { next(e); }
  }
  async deleteRole(req: Request, res: Response, next: NextFunction) {
    try { await commissionService.deleteRole(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const { roleId, staffId } = req.body;
      if (!roleId || !staffId) throw new AppError('Rol ve personel ID gerekli.', 400);
      res.json({ success: true, data: await commissionService.assign({ roleId, staffId }) });
    } catch (e) { next(e); }
  }
  async unassign(req: Request, res: Response, next: NextFunction) {
    try { await commissionService.unassign(req.params.roleId); res.json({ success: true }); }
    catch (e) { next(e); }
  }
}

export const commissionController = new CommissionController();
