import { Router } from 'express';
import { whatsappController } from './whatsapp.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.get('/status', authMiddleware, adminOnly, whatsappController.getStatus);
router.post('/connect', authMiddleware, adminOnly, whatsappController.connect);
router.post('/disconnect', authMiddleware, adminOnly, whatsappController.disconnect);
router.post('/send/absenteeism/:id', authMiddleware, adminOnly, whatsappController.sendAbsenteeism);
router.post('/preview/absenteeism/:id', authMiddleware, adminOnly, whatsappController.previewAbsenteeism);
router.get('/full-image/absenteeism/:id', authMiddleware, adminOnly, whatsappController.fullImageAbsenteeism);
router.post('/send/warning/:id', authMiddleware, adminOnly, whatsappController.sendWarning);
router.post('/preview/warning/:id', authMiddleware, adminOnly, whatsappController.previewWarning);

export default router;
