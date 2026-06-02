import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { parentNotificationService } from './parentNotification.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';

class ParentNotificationController {
  /** POST /api/parent-notification/generate-pdf */
  async generatePdf(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId, absenceDay, meetingDate, absenceData, parentName } = req.body as {
        studentId?: string;
        absenceDay?: number;
        meetingDate?: string;
        absenceData?: { excusedDays?: string; unexcusedDays?: string; totalDays?: string };
        parentName?: string;
      };

      if (!studentId) throw new AppError('studentId zorunludur.', 400);

      const validDays = [5, 15, 25];
      if (!absenceDay || !validDays.includes(absenceDay)) {
        throw new AppError('absenceDay 5, 15 veya 25 olmalıdır.', 400);
      }

      const pdfPath = await parentNotificationService.generatePdf({
        studentId,
        absenceDay: absenceDay as 5 | 15 | 25,
        meetingDate: meetingDate ? new Date(meetingDate) : undefined,
        absenceData,
        overrideParentName: parentName,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="veli-bildirim-tutanagi-${absenceDay}.pdf"`,
      );

      const stream = fs.createReadStream(pdfPath);
      stream.on('end', () => {
        fs.unlink(pdfPath, () => {});
      });
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  }
}

export const parentNotificationController = new ParentNotificationController();
