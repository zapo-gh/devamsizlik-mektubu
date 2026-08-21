import { Router } from 'express';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { student360Controller } from './student360.controller';

const router = Router();
router.use(authMiddleware, adminOnly);
router.get('/:id', student360Controller.getById);

export default router;
