import { Router } from 'express';
import { commissionController } from './commission.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, adminOnly, commissionController.getAll);
router.post('/', authMiddleware, adminOnly, commissionController.create);
router.put('/:id', authMiddleware, adminOnly, commissionController.update);
router.delete('/:id', authMiddleware, adminOnly, commissionController.delete);

// Roller
router.post('/roles', authMiddleware, adminOnly, commissionController.addRole);
router.delete('/roles/:id', authMiddleware, adminOnly, commissionController.deleteRole);

// Atamalar
router.post('/assign', authMiddleware, adminOnly, commissionController.assign);
router.delete('/unassign/:roleId', authMiddleware, adminOnly, commissionController.unassign);

export default router;
