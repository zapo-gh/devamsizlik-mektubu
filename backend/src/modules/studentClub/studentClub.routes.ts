import { Router, Request, Response, NextFunction } from 'express';
import { studentClubService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const clubSchema = z.object({
  name: z.string().min(1), description: z.string().optional(),
  assignedStaffId: z.string().optional(), meetingDay: z.string().optional(),
  meetingTime: z.string().optional(), maxMembers: z.number().optional(),
  academicYear: z.string().min(1),

  extraData: z.string().optional(),
});
const memberSchema = z.object({
  clubId: z.string().min(1), studentId: z.string().min(1), role: z.string().optional(),

  extraData: z.string().optional(),
});

const router = Router();

// Kulüpler
router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await studentClubService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = clubSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await studentClubService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await studentClubService.update(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await studentClubService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

// Üyeler
router.get('/:id/members', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await studentClubService.getMembers(req.params.id) }); }
  catch (e) { next(e); }
});

router.post('/members', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = memberSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await studentClubService.addMember(p.data) });
  } catch (e) { next(e); }
});

router.delete('/members/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await studentClubService.removeMember(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
