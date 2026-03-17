import { Router } from 'express';
import { violationsController } from './violations.controller';
import { violationImageUpload } from './imageUpload.middleware';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// All routes require admin auth
router.get('/stats', authMiddleware, adminOnly, violationsController.getStats);
router.get('/uploads', authMiddleware, adminOnly, violationsController.getUploads);
router.get('/uploads/:uploadId', authMiddleware, adminOnly, violationsController.getUploadDetail);

router.post(
  '/upload',
  authMiddleware,
  adminOnly,
  violationImageUpload.single('image'),
  violationsController.upload
);

router.post('/process-text', authMiddleware, adminOnly, violationsController.processText);

router.post('/:uploadId/confirm', authMiddleware, adminOnly, violationsController.confirmViolations);
router.post('/:uploadId/manual', authMiddleware, adminOnly, violationsController.addManual);

router.delete('/record/:violationId', authMiddleware, adminOnly, violationsController.removeViolation);
router.delete('/uploads/:uploadId', authMiddleware, adminOnly, violationsController.deleteUpload);

export default router;
