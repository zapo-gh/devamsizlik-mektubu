import { Router, Request, Response, NextFunction } from 'express';
import { fieldTripService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1), destination: z.string().min(1), date: z.string().min(1),
  returnDate: z.string().optional(), purpose: z.string().optional(),
  transportation: z.string().optional(), assignedStaffId: z.string().optional(),
  academicYear: z.string().min(1), participantClasses: z.string().optional(),
  notes: z.string().optional(), status: z.string().optional(),

  extraData: z.string().optional(),
});

const router = Router();

router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await fieldTripService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await fieldTripService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await fieldTripService.update(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await fieldTripService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
