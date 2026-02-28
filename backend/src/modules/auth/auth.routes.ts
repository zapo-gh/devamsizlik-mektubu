import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';
import { loginLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

router.post('/login', loginLimiter, authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/change-password', authMiddleware, authController.changePassword);

export default router;
