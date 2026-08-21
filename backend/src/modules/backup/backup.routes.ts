import { Router } from 'express';
import { authMiddleware, adminOnly } from '../shared/middleware/auth.middleware';
import { createDatabaseBackup, listBackups, pruneOldBackups } from './backup.service';

const router = Router();

router.use(authMiddleware, adminOnly);

router.get('/', async (_req, res, next) => {
  try {
    res.json({ success: true, backups: await listBackups() });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (_req, res, next) => {
  try {
    const backup = await createDatabaseBackup();
    const removed = await pruneOldBackups();
    res.status(201).json({
      success: true,
      backup: {
        fileName: backup.fileName,
        sizeBytes: backup.sizeBytes,
        createdAt: backup.createdAt,
      },
      removedOldBackups: removed,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
