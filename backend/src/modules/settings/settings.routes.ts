import { Router } from 'express';
import { settingsController } from './settings.controller';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';

const router = Router();

// GET /api/settings - get school settings
router.get('/', authMiddleware, adminOnly, settingsController.get);

// PUT /api/settings - update school settings
router.put('/', authMiddleware, adminOnly, settingsController.update);

export default router;
