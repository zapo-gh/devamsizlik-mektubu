import { Request, Response, NextFunction } from 'express';
import { absenteeismService } from './absenteeism.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const createSchema = z.object({
  studentId: z.string().uuid('Geçersiz öğrenci ID.'),
  warningNumber: z.number().int().min(1, 'Uyarı numarası en az 1 olmalıdır.').max(10, 'Uyarı numarası en fazla 10 olabilir.'),
});

const generateOtpSchema = z.object({
  parentPhone: z.string().min(10, 'Geçerli bir telefon numarası giriniz.'),
  parentName: z.string().optional().default(''),
});

export class AbsenteeismController {
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await absenteeismService.getStats();
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

      const result = await absenteeismService.getAll(page, limit, studentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await absenteeismService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getWarningCount(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = req.params.studentId;
      const count = await absenteeismService.getWarningCount(studentId);
      res.json({ success: true, data: { count, nextWarning: count + 1 } });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('Dosya yüklenmelidir (PDF, JPG veya PNG).', 400);
      }

      const parsed = createSchema.safeParse({
        studentId: req.body.studentId,
        warningNumber: parseInt(req.body.warningNumber, 10) || 1,
      });

      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await absenteeismService.create({
        studentId: parsed.data.studentId,
        warningNumber: parsed.data.warningNumber,
        pdfPath: req.file.path,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async generateOtpAndLink(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = generateOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await absenteeismService.generateOtpAndWhatsAppLink(
        req.params.id,
        parsed.data.parentPhone,
        parsed.data.parentName || ''
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async servePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const fullPath = await absenteeismService.servePdf(req.params.id);
      const ext = fullPath.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
      };
      const contentType = mimeMap[ext || ''] || 'application/octet-stream';
      const fileName = `devamsizlik-mektubu.${ext || 'pdf'}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
      res.sendFile(fullPath);
    } catch (error) {
      next(error);
    }
  }

  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const fullPath = await absenteeismService.servePdf(req.params.id);
      const ext = fullPath.split('.').pop()?.toLowerCase();
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
      };
      const contentType = mimeMap[ext || ''] || 'application/octet-stream';
      const fileName = `devamsizlik-mektubu.${ext || 'pdf'}`;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.sendFile(fullPath);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await absenteeismService.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const absenteeismController = new AbsenteeismController();
