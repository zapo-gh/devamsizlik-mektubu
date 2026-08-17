import { Router } from 'express';
import { boardMeetingController } from './boardMeeting.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, adminOnly, boardMeetingController.getAll);
router.get('/:id', authMiddleware, adminOnly, boardMeetingController.getById);
router.post('/', authMiddleware, adminOnly, boardMeetingController.create);
router.put('/:id', authMiddleware, adminOnly, boardMeetingController.update);
router.delete('/:id', authMiddleware, adminOnly, boardMeetingController.delete);

// Gündem maddeleri
router.post('/agenda', authMiddleware, adminOnly, boardMeetingController.addAgendaItem);
router.put('/agenda/:id', authMiddleware, adminOnly, boardMeetingController.updateAgendaItem);
router.delete('/agenda/:id', authMiddleware, adminOnly, boardMeetingController.deleteAgendaItem);

export default router;
