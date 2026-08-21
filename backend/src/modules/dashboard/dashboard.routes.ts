import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, adminOnly);
router.get('/summary', dashboardController.getSummary);

export default router;
