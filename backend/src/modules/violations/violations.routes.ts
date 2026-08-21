import { Router } from 'express';
import { violationsController } from './violations.controller';
import { getViolationSource } from './violation-source.controller';
import { violationImageUpload } from './imageUpload.middleware';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { compressImage } from '../shared/middleware/imageCompressor.middleware';
import { uploadLimiter, expensiveOperationLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

router.get('/stats', authMiddleware, adminOnly, violationsController.getStats);
router.get('/student/:studentId', authMiddleware, adminOnly, violationsController.getStudentHistory.bind(violationsController));
router.get('/student/record/:violationId/source', authMiddleware, adminOnly, getViolationSource);
router.get('/uploads', authMiddleware, adminOnly, violationsController.getUploads);
router.get('/uploads/:uploadId', authMiddleware, adminOnly, violationsController.getUploadDetail);

router.post(
  '/upload',
  authMiddleware,
  adminOnly,
  uploadLimiter,
  violationImageUpload.single('image'),
  validateMagicBytes(['image/jpeg', 'image/png']),
  compressImage,
  violationsController.upload,
);

router.post('/process-text', authMiddleware, adminOnly, expensiveOperationLimiter, violationsController.processText);

router.post('/:uploadId/confirm', authMiddleware, adminOnly, violationsController.confirmViolations);
router.post('/:uploadId/manual', authMiddleware, adminOnly, violationsController.addManual);

router.delete('/record/:violationId', authMiddleware, adminOnly, violationsController.removeViolation);
router.delete('/uploads/:uploadId', authMiddleware, adminOnly, violationsController.deleteUpload);

export default router;
