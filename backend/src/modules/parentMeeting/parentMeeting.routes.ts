import { Router } from 'express';
import { parentMeetingController } from './parentMeeting.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.use(authMiddleware, adminOnly);

router.get('/classes', parentMeetingController.getClasses);
router.post('/generate-pdf', parentMeetingController.generatePdf);

export default router;
