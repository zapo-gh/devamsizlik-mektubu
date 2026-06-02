import { Router } from 'express';
import { tebligController } from './teblig.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, adminOnly);
router.post('/generate-pdf', tebligController.generatePdf);

export default router;
