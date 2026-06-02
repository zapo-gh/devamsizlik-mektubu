import { Router } from 'express';
import { staffController } from './staff.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, adminOnly, staffController.getAll);
router.get('/by-class/:className', authMiddleware, adminOnly, staffController.getByClass);
router.post('/', authMiddleware, adminOnly, staffController.create);
router.put('/:id', authMiddleware, adminOnly, staffController.update);
router.delete('/:id', authMiddleware, adminOnly, staffController.delete);

export default router;
