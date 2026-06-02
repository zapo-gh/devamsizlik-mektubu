import { Router } from 'express';
import { absenteeismController } from './absenteeism.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { pdfUpload } from './pdfUpload.middleware';

const router = Router();

// Admin routes
router.get('/stats', authMiddleware, adminOnly, absenteeismController.getStats);
router.get('/', authMiddleware, adminOnly, absenteeismController.getAll);
router.get('/warning-count/:studentId', authMiddleware, adminOnly, absenteeismController.getWarningCount);
router.get('/:id', authMiddleware, adminOnly, absenteeismController.getById);
router.post(
  '/',
  authMiddleware,
  adminOnly,
  pdfUpload.single('pdf'),
  absenteeismController.create
);
router.delete('/:id', authMiddleware, adminOnly, absenteeismController.delete);

// PDF serving routes (admin only)
router.get('/:id/pdf', authMiddleware, adminOnly, absenteeismController.servePdf);
router.get('/:id/pdf/download', authMiddleware, adminOnly, absenteeismController.downloadPdf);

export default router;
