import { Router } from 'express';
import { supplierController } from './supplier.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, adminOnly, supplierController.getAll);
router.get('/:id', authMiddleware, adminOnly, supplierController.getById);
router.post('/', authMiddleware, adminOnly, supplierController.create);
router.put('/:id', authMiddleware, adminOnly, supplierController.update);
router.delete('/:id', authMiddleware, adminOnly, supplierController.delete);

export default router;
