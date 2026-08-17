import { Router } from 'express';
import { holidayController } from './holiday.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, adminOnly, holidayController.getAll);
router.post('/', authMiddleware, adminOnly, holidayController.create);
router.put('/:id', authMiddleware, adminOnly, holidayController.update);
router.delete('/:id', authMiddleware, adminOnly, holidayController.delete);

export default router;
