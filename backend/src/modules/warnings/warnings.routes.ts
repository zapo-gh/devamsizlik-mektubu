import { Router } from 'express';
import { warningsController } from './warnings.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// All routes require admin auth
router.get('/behaviors', authMiddleware, adminOnly, warningsController.getBehaviors);
router.get('/stats', authMiddleware, adminOnly, warningsController.getStats);
router.get('/', authMiddleware, adminOnly, warningsController.getAll);
router.get('/warning-count/:studentId', authMiddleware, adminOnly, warningsController.getWarningCount);
router.get('/:id', authMiddleware, adminOnly, warningsController.getById);
router.post('/', authMiddleware, adminOnly, warningsController.create);
router.get('/:id/pdf', authMiddleware, adminOnly, warningsController.servePdf);
router.get('/:id/pdf/download', authMiddleware, adminOnly, warningsController.downloadPdf);
router.get('/:id/whatsapp', authMiddleware, adminOnly, warningsController.getWhatsAppLink);
router.delete('/:id', authMiddleware, adminOnly, warningsController.delete);

export default router;
