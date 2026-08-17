import { Request, Response, NextFunction } from 'express';
import { dutyScheduleService } from './dutySchedule.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const stationSchema = z.object({ name: z.string().min(1), sortOrder: z.number().optional() });
const assignmentSchema = z.object({
  staffId: z.string().min(1), stationId: z.string().min(1),
  dayOfWeek: z.number().min(1).max(5), weekNumber: z.number().optional(),
  academicYear: z.string().min(1),
});
const bulkSchema = z.object({
  academicYear: z.string().min(1),
  assignments: z.array(z.object({
    staffId: z.string().min(1), stationId: z.string().min(1),
    dayOfWeek: z.number().min(1).max(5), weekNumber: z.number().optional(),
  })),
});

export class DutyScheduleController {
  async getStations(_req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await dutyScheduleService.getStations() }); }
    catch (e) { next(e); }
  }
  async createStation(req: Request, res: Response, next: NextFunction) {
    try {
      const p = stationSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      res.status(201).json({ success: true, data: await dutyScheduleService.createStation(p.data) });
    } catch (e) { next(e); }
  }
  async updateStation(req: Request, res: Response, next: NextFunction) {
    try { await dutyScheduleService.updateStation(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async deleteStation(req: Request, res: Response, next: NextFunction) {
    try { await dutyScheduleService.deleteStation(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async getAssignments(req: Request, res: Response, next: NextFunction) {
    try {
      const ay = (req.query.academicYear as string) || '2025-2026';
      res.json({ success: true, data: await dutyScheduleService.getAssignments(ay) });
    } catch (e) { next(e); }
  }
  async createAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const p = assignmentSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      res.status(201).json({ success: true, data: await dutyScheduleService.createAssignment(p.data) });
    } catch (e) { next(e); }
  }
  async deleteAssignment(req: Request, res: Response, next: NextFunction) {
    try { await dutyScheduleService.deleteAssignment(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async bulkSave(req: Request, res: Response, next: NextFunction) {
    try {
      const p = bulkSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      await dutyScheduleService.bulkSaveAssignments(p.data.academicYear, p.data.assignments);
      res.json({ success: true });
    } catch (e) { next(e); }
  }
}

export const dutyScheduleController = new DutyScheduleController();
