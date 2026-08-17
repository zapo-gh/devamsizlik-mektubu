import { Router, Request, Response, NextFunction } from 'express';
import { parentAssociationService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const meetingSchema = z.object({
  date: z.string().min(1), type: z.string().optional(), meetingNumber: z.number().optional(),
  academicYear: z.string().min(1), notes: z.string().optional(), decisions: z.string().optional(),

  extraData: z.string().optional(),
});
const memberSchema = z.object({
  fullName: z.string().min(1), role: z.string().optional(),
  phone: z.string().optional(), academicYear: z.string().min(1),

  extraData: z.string().optional(),
});

const router = Router();

// Toplantılar
router.get('/meetings', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await parentAssociationService.getMeetings(ay) });
  } catch (e) { next(e); }
});

router.post('/meetings', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = meetingSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await parentAssociationService.createMeeting(p.data) });
  } catch (e) { next(e); }
});

router.put('/meetings/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await parentAssociationService.updateMeeting(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.delete('/meetings/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await parentAssociationService.deleteMeeting(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

// Üyeler
router.get('/members', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await parentAssociationService.getMembers(ay) });
  } catch (e) { next(e); }
});

router.post('/members', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = memberSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await parentAssociationService.createMember(p.data) });
  } catch (e) { next(e); }
});

router.put('/members/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await parentAssociationService.updateMember(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.delete('/members/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await parentAssociationService.deleteMember(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
