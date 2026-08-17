import { Router, Request, Response, NextFunction } from 'express';
import { annualPlanService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const createSchema = z.object({
  academicYear: z.string().min(1), month: z.number().min(1).max(12),
  title: z.string().min(1), description: z.string().optional(),
  category: z.string().optional(), sortOrder: z.number().optional(),

  extraData: z.string().optional(),
});

const router = Router();

router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await annualPlanService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await annualPlanService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await annualPlanService.update(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await annualPlanService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
