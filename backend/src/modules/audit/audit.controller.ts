import { Request, Response, NextFunction } from 'express';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class AuditController {
  async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      // Sadece admin yetkisi (auth.middleware 'adminOnly' ile korunacak)
      
      const take = parseInt(req.query.take as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      const logs = await prisma.auditLog.findMany({
        take,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              username: true,
              role: true
            }
          }
        }
      });

      const total = await prisma.auditLog.count();

      res.json({ success: true, data: { logs, total } });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
