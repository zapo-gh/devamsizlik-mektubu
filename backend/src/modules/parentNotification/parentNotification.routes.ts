import { Router } from 'express';
import { parentNotificationController } from './parentNotification.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, adminOnly);

router.post('/generate-pdf', parentNotificationController.generatePdf);

export default router;
