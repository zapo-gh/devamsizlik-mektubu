import { Router } from 'express';
import { otpController } from './otp.controller';
import { otpLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

// Public routes - parent verifies OTP
router.post('/verify', otpLimiter, otpController.verifyByToken);
router.get('/info/:token', otpController.getTokenInfo);

export default router;
