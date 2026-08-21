import { Router } from 'express';
import multer from 'multer';
import { studentsController } from './students.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { validateMagicBytes } from '../shared/middleware/magicByteValidator.middleware';
import { uploadLimiter } from '../shared/middleware/rateLimit.middleware';
import { config } from '../shared/config';

const router = Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) cb(null, true);
    else cb(new Error('Sadece Excel (.xlsx, .xls) dosyaları yüklenebilir.'));
  },
});

router.use(authMiddleware, adminOnly);

const excelMimes = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/CDFV2',
];

router.post('/import-excel', uploadLimiter, excelUpload.single('file'), validateMagicBytes(excelMimes), studentsController.importExcel);
router.post('/import-parents', uploadLimiter, excelUpload.single('file'), validateMagicBytes(excelMimes), studentsController.importParents);
router.get('/', studentsController.getAll);
router.get('/:id', studentsController.getById);
router.post('/', studentsController.create);
router.put('/:id', studentsController.update);
router.post('/bulk-delete', studentsController.bulkDelete);
router.delete('/:id', studentsController.delete);
router.post('/:id/parents', studentsController.addParent);
router.post('/:id/assign-parent', studentsController.assignParent);
router.post('/parents/:parentId/reset-password', studentsController.resetParentPassword);
router.put('/parents/:parentId', studentsController.updateParent);
router.delete('/:id/parents/:parentId', studentsController.removeParent);

export default router;
