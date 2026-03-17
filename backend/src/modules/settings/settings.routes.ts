import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authMiddleware } from '../shared/middleware/auth.middleware';

const router = Router();

// GET /api/settings - get school settings
router.get('/', authMiddleware, settingsController.get);

// PUT /api/settings - update school settings
router.put('/', authMiddleware, settingsController.update);

export default router;
