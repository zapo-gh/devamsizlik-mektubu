import { Router, Request, Response, NextFunction } from 'express';
import { staffTransferService } from '../shared/services/moduleServices';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { z } from 'zod';

const createSchema = z.object({
  staffName: z.string().min(1), staffTitle: z.string().optional(),
  tcKimlikNo: z.string().optional(), sicilNo: z.string().optional(),
  currentSchool: z.string().optional(), newSchool: z.string().optional(),
  transferDate: z.string().min(1), transferReason: z.string().optional(),
  academicYear: z.string().min(1), notes: z.string().optional(),
  extraData: z.string().optional(),
});

const router = Router();

router.get('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ay = (req.query.academicYear as string) || '2025-2026';
    res.json({ success: true, data: await staffTransferService.getAll(ay) });
  } catch (e) { next(e); }
});

router.post('/', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const p = createSchema.safeParse(req.body);
    if (!p.success) throw new AppError(p.error.errors[0].message, 400);
    res.status(201).json({ success: true, data: await staffTransferService.create(p.data) });
  } catch (e) { next(e); }
});

router.put('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await staffTransferService.update(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { next(e); }
});

router.delete('/:id', authMiddleware, adminOnly, async (req: Request, res: Response, next: NextFunction) => {
  try { await staffTransferService.delete(req.params.id); res.json({ success: true }); }
  catch (e) { next(e); }
});

export default router;
