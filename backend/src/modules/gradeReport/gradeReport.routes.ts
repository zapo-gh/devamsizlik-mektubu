import { Router } from 'express';
import { gradeReportController } from './gradeReport.controller';
import { karneUpload } from './karneUpload.middleware';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// Tüm route'lar admin yetkisi gerektirir
router.use(authMiddleware, adminOnly);

/** Karne yükle + analiz et */
router.post('/analyze', karneUpload.single('karne'), gradeReportController.analyze);

/** Rapor listesi */
router.get('/', gradeReportController.list);

/** Arşivlenmiş raporlar */
router.get('/archived', gradeReportController.listArchived);

/** Tek rapor */
router.get('/:id', gradeReportController.getOne);

/** PDF'leri üret */
router.post('/:id/generate-pdfs', gradeReportController.generatePdfs);

/** Raporu arşivle */
router.patch('/:id/archive', gradeReportController.archiveReport);

/** Raporu sil */
router.delete('/:id', gradeReportController.deleteReport);

/** Öğrenci PDF indir */
router.get('/students/:studentRecordId/pdf', gradeReportController.downloadPdf);

/** Öğrenci eşleşmesini güncelle */
router.patch('/students/:studentRecordId/match', gradeReportController.updateMatch);

/** Debug: ham metin + parse sonucu — yalnızca geliştirme ortamında */
if (process.env.NODE_ENV !== 'production') {
  router.post('/debug-parse', karneUpload.single('karne'), gradeReportController.debugParse);
}

export default router;
