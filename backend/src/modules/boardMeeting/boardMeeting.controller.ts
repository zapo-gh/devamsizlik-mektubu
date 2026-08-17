import { Request, Response, NextFunction } from 'express';
import { boardMeetingService } from './boardMeeting.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const createSchema = z.object({
  date: z.string().min(1), type: z.string().min(1), meetingNumber: z.number().min(1),
  academicYear: z.string().min(1), notes: z.string().optional(),

  extraData: z.string().optional(),
});
const agendaSchema = z.object({
  meetingId: z.string().min(1), orderNumber: z.number().min(1),
  topic: z.string().min(1), decision: z.string().optional(), explanation: z.string().optional(),

  extraData: z.string().optional(),
});

export class BoardMeetingController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const ay = (req.query.academicYear as string) || '2025-2026';
      res.json({ success: true, data: await boardMeetingService.getAll(ay) });
    } catch (e) { next(e); }
  }
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const m = await boardMeetingService.getById(req.params.id);
      if (!m) throw new AppError('Toplantı bulunamadı.', 404);
      res.json({ success: true, data: m });
    } catch (e) { next(e); }
  }
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const p = createSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      res.status(201).json({ success: true, data: await boardMeetingService.create(p.data) });
    } catch (e) { next(e); }
  }
  async update(req: Request, res: Response, next: NextFunction) {
    try { await boardMeetingService.update(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async delete(req: Request, res: Response, next: NextFunction) {
    try { await boardMeetingService.delete(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async addAgendaItem(req: Request, res: Response, next: NextFunction) {
    try {
      const p = agendaSchema.safeParse(req.body);
      if (!p.success) throw new AppError(p.error.errors[0].message, 400);
      res.status(201).json({ success: true, data: await boardMeetingService.addAgendaItem(p.data) });
    } catch (e) { next(e); }
  }
  async updateAgendaItem(req: Request, res: Response, next: NextFunction) {
    try { await boardMeetingService.updateAgendaItem(req.params.id, req.body); res.json({ success: true }); }
    catch (e) { next(e); }
  }
  async deleteAgendaItem(req: Request, res: Response, next: NextFunction) {
    try { await boardMeetingService.deleteAgendaItem(req.params.id); res.json({ success: true }); }
    catch (e) { next(e); }
  }
}

export const boardMeetingController = new BoardMeetingController();
