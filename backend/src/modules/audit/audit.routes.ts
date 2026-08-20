import { Router } from 'express';
import { auditController } from './audit.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// Sadece yöneticiler (ADMIN) erişebilir
router.use(authMiddleware, adminOnly);

router.get('/logs', auditController.getLogs);

export default router;
