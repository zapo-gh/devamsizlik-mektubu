import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { parentMeetingService } from './parentMeeting.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';

class ParentMeetingController {
  /** GET /api/parent-meeting/classes */
  async getClasses(req: Request, res: Response, next: NextFunction) {
    try {
      const classes = await parentMeetingService.getClasses();
      res.json({ success: true, data: classes });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/parent-meeting/generate-pdf */
  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { className, classNames, meetingDate, schoolYear, term, includeParentName } = req.body as {
        className?: string;
        classNames?: string[];
        meetingDate?: string;
        schoolYear?: string;
        term?: string;
        includeParentName?: boolean;
      };

      // classNames array öncelikli; yoksa tekil className'i array'e çevir
      const resolvedNames =
        classNames && classNames.length > 0
          ? classNames
          : className
          ? [className]
          : null;

      if (!resolvedNames || resolvedNames.length === 0)
        throw new AppError('En az bir sınıf seçilmelidir.', 400);

      const pdfPath = await parentMeetingService.generatePdf({
        classNames: resolvedNames,
        meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
        schoolYear: schoolYear || '2025-2026',
        term: term || '1. DÖNEM',
        includeParentName: includeParentName !== false,
      });

      const fileLabel =
        resolvedNames.length === 1
          ? resolvedNames[0].replace(/[^a-zA-Z0-9]/g, '_')
          : `${resolvedNames.length}-sinif`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="veli-imza-sirkusu-${fileLabel}.pdf"`,
      );

      const stream = fs.createReadStream(pdfPath);
      stream.on('end', () => {
        // Geçici dosyayı temizle
        fs.unlink(pdfPath, () => {});
      });
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export const parentMeetingController = new ParentMeetingController();
