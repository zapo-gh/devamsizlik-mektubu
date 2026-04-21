import { Request, Response, NextFunction } from 'express';
import { warningsService } from './warnings.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const createSchema = z.object({
  studentId: z.string().uuid('Geçersiz öğrenci ID.'),
  behaviorCode: z.string().min(1, 'Davranış kodu gereklidir.'),
  description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir.').optional(),
  guidanceNote: z.string().max(500, 'Rehberlik notu en fazla 500 karakter olabilir.').optional(),
  issuedBy: z.string().max(100).optional(),
  schoolName: z.string().max(200).optional(),
  classTeacherName: z.string().max(100).optional(),
  schoolCounselorName: z.string().max(100).optional(),
});

export class WarningsController {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await warningsService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBehaviors(req: Request, res: Response, next: NextFunction) {
    try {
      const result = warningsService.getBehaviors();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const studentId = req.query.studentId as string | undefined;

      const result = await warningsService.getAll(page, limit, studentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await warningsService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getWarningCount(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId;
      const count = await warningsService.getWarningCount(studentId);
      res.json({ success: true, data: { count, nextWarning: count + 1 } });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createSchema.safeParse(req.body);

      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await warningsService.create(parsed.data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async servePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const fullPath = await warningsService.servePdf(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="yazili-uyari.pdf"`);
      res.sendFile(fullPath);
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const fullPath = await warningsService.servePdf(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="yazili-uyari.pdf"`);
      res.sendFile(fullPath);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await warningsService.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getWhatsAppLink(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await warningsService.getWhatsAppLink(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const warningsController = new WarningsController();
