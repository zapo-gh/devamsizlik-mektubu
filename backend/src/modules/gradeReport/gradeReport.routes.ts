import { Router } from 'express';
import { gradeReportController } from './gradeReport.controller';
import { karneUpload } from './karneUpload.middleware';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { uploadLimiter, expensiveOperationLimiter } from '../shared/middleware/rateLimit.middleware';

const router = Router();

router.use(authMiddleware, adminOnly);

/** Karne yükle + analiz et */
router.post(
  '/analyze',
  uploadLimiter,
  expensiveOperationLimiter,
  karneUpload.single('karne'),
  validateMagicBytes(['application/pdf']),
  gradeReportController.analyze,
);

router.get('/', gradeReportController.list);
router.get('/archived', gradeReportController.listArchived);
router.get('/:id', gradeReportController.getOne);
router.post('/:id/generate-pdfs', expensiveOperationLimiter, gradeReportController.generatePdfs);
router.patch('/:id/archive', gradeReportController.archiveReport);
router.delete('/:id', gradeReportController.deleteReport);
router.get('/students/:studentRecordId/pdf', gradeReportController.downloadPdf);
router.patch('/students/:studentRecordId/match', gradeReportController.updateMatch);

if (process.env.NODE_ENV !== 'production') {
  router.post('/debug-parse', uploadLimiter, karneUpload.single('karne'), validateMagicBytes(['application/pdf']), gradeReportController.debugParse);
}

export default router;
