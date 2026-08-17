import { Router } from 'express';
import { dutyScheduleController } from './dutySchedule.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// Nöbet Noktaları
router.get('/stations', authMiddleware, adminOnly, dutyScheduleController.getStations);
router.post('/stations', authMiddleware, adminOnly, dutyScheduleController.createStation);
router.put('/stations/:id', authMiddleware, adminOnly, dutyScheduleController.updateStation);
router.delete('/stations/:id', authMiddleware, adminOnly, dutyScheduleController.deleteStation);

// Nöbet Atamaları
router.get('/assignments', authMiddleware, adminOnly, dutyScheduleController.getAssignments);
router.post('/assignments', authMiddleware, adminOnly, dutyScheduleController.createAssignment);
router.delete('/assignments/:id', authMiddleware, adminOnly, dutyScheduleController.deleteAssignment);
router.post('/assignments/bulk', authMiddleware, adminOnly, dutyScheduleController.bulkSave);

export default router;
