import { Router } from 'express';
import multer from 'multer';
import { studentsController } from './students.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// Multer for Excel upload (memory storage)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.xlsx?$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel (.xlsx, .xls) dosyaları yüklenebilir.'));
    }
  },
});

// All student routes require admin authentication
router.use(authMiddleware, adminOnly);

router.post('/import-excel', excelUpload.single('file'), studentsController.importExcel);
router.post('/import-parents', excelUpload.single('file'), studentsController.importParents);
router.get('/', studentsController.getAll);
router.get('/:id', studentsController.getById);
router.post('/', studentsController.create);
router.put('/:id', studentsController.update);
router.post('/bulk-delete', studentsController.bulkDelete);
router.delete('/:id', studentsController.delete);
router.post('/:id/assign-parent', studentsController.assignParent);
router.put('/parents/:parentId', studentsController.updateParent);
router.delete('/:id/parents/:parentId', studentsController.removeParent);

export default router;
