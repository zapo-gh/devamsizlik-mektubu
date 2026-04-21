import { Request, Response, NextFunction } from 'express';
import { violationsService } from './violations.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const confirmSchema = z.object({
  violationIds: z.array(z.string().uuid()).min(1, 'En az bir ihlal seçilmelidir.'),
});

const addManualSchema = z.object({
  studentId: z.string().uuid('Geçersiz öğrenci ID.'),
  type: z.enum(['KIYAFET', 'TOREN_GEC', 'DIGER']),
  violationDate: z.string().optional(),
});

const manualTextSchema = z.object({
  text: z.string().min(1, 'Metin girişi boş olamaz.'),
  type: z.enum(['KIYAFET', 'TOREN_GEC', 'DIGER']),
  description: z.string().optional(),
  violationDate: z.string().optional(),
});

export class ViolationsController {
  /**
   * POST /api/violations/upload
   * Fotoğraf yükle → OCR → Eşleştir
   */
  async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('Fotoğraf yüklenmedi.', 400);
      }

      const type = req.body.type;
      if (!['KIYAFET', 'TOREN_GEC', 'DIGER'].includes(type)) {
        throw new AppError('Geçersiz ihlal tipi. (KIYAFET, TOREN_GEC, DIGER)', 400);
      }

      const result = await violationsService.processUpload({
        imagePath: req.file.path,
        type,
        description: req.body.description,
        uploadedBy: req.body.uploadedBy,
        violationDate: req.body.violationDate,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/violations/process-text
   * Manuel metin/numara girişi → Eşleştir
   * OCR başarısız olduğunda kullanılır.
   */
  async processText(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = manualTextSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await violationsService.processManualText({
        text: parsed.data.text,
        type: parsed.data.type,
        description: parsed.data.description,
        violationDate: parsed.data.violationDate,
        uploadedBy: 'Okul Yönetimi',
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/violations/:uploadId/confirm
   * Seçilen ihlalleri onayla
   */
  async confirmViolations(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = confirmSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await violationsService.confirmViolations(
        req.params.uploadId,
        parsed.data.violationIds
      );

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/violations/:uploadId/manual
   * Manuel öğrenci ekleme
   */
  async addManual(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = addManualSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await violationsService.addManualViolation({
        uploadId: req.params.uploadId,
        ...parsed.data,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/violations/record/:violationId
   * Yanlış eşleşen kaydı sil
   */
  async removeViolation(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await violationsService.removeViolation(req.params.violationId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/violations/uploads
   * Son yüklemeleri listele
   */
  async getUploads(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await violationsService.getUploads(page, limit);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/violations/uploads/:uploadId
   * Upload detayı
   */
  async getUploadDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await violationsService.getUploadDetail(req.params.uploadId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/violations/uploads/:uploadId
   * Upload ve ilişkili kayıtları sil
   */
  async deleteUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await violationsService.deleteUpload(req.params.uploadId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/violations/stats
   * İhlal istatistikleri
   */
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await violationsService.getStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const violationsController = new ViolationsController();
