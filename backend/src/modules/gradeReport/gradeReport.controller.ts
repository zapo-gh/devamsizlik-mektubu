import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { gradeReportService } from './gradeReport.service';
import { parseKarnePdf } from './karneParser.service';
import { parseKarneExcel } from './karneExcelParser.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { karneUpload } from './karneUpload.middleware';

class GradeReportController {

  /** POST /api/grade-reports/analyze  (multipart: file + schoolYear + meetingDate) */
  async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('Karne dosyası gereklidir.', 400);

      const schoolYear  = (req.body.schoolYear  as string)?.trim() || '2025 / 2026';
      const meetingDate = req.body.meetingDate
        ? new Date(req.body.meetingDate as string)
        : new Date();

      const isExcel = /\.(xlsx|xls)$/i.test(req.file.originalname) ||
        req.file.mimetype !== 'application/pdf';

      const result = await gradeReportService.analyzeKarne(
        req.file.path,
        schoolYear,
        meetingDate,
        isExcel ? 'excel' : 'pdf',
      );

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /** POST /api/grade-reports/:id/generate-pdfs */
  async generatePdfs(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { studentIds } = req.body as { studentIds?: string[] };

      const results = await gradeReportService.generatePdfs(id, studentIds);
      res.json({ success: true, data: results });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/grade-reports */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await gradeReportService.listReports();
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/grade-reports/:id */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await gradeReportService.getReport(req.params.id);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  /** DELETE /api/grade-reports/:id */
  async deleteReport(req: Request, res: Response, next: NextFunction) {
    try {
      await gradeReportService.deleteReport(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /api/grade-reports/:id/archive */
  async archiveReport(req: Request, res: Response, next: NextFunction) {
    try {
      await gradeReportService.archiveReport(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/grade-reports/archived */
  async listArchived(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await gradeReportService.listArchivedReports();
      res.json({ success: true, data: reports });
    } catch (err) {
      next(err);
    }
  }

  /** GET /api/grade-reports/students/:studentRecordId/pdf */
  async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const pdfPath = await gradeReportService.getStudentPdfPath(req.params.studentRecordId);

      if (!fs.existsSync(pdfPath)) {
        throw new AppError('PDF dosyası bulunamadı.', 404);
      }

      const fileName = path.basename(pdfPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      fs.createReadStream(pdfPath).pipe(res);
    } catch (err) {
      next(err);
    }
  }

  /** PATCH /api/grade-reports/students/:studentRecordId/match */
  async updateMatch(req: Request, res: Response, next: NextFunction) {
    try {
      const { studentId } = req.body as { studentId: string | null };
      const updated = await gradeReportService.updateStudentMatch(
        req.params.studentRecordId,
        studentId ?? null,
      );
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/grade-reports/debug-parse
   * Karne PDF'inin ham metnini ve parse sonucunu (eşik olmadan) döndürür.
   * Geliştirme/hata ayıklama için.
   */
  async debugParse(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('Dosya gereklidir.', 400);

      const isExcel = /\.(xlsx|xls)$/i.test(req.file.originalname) ||
        req.file.mimetype !== 'application/pdf';

      if (isExcel) {
        const students = parseKarneExcel(req.file.path);
        res.json({
          success: true,
          data: {
            rawTextPreview: `Excel parse edildi. ${students.length} öğrenci bulundu.`,
            allStudents: students,
          },
        });
      } else {
        const { students, rawText } = await parseKarnePdf(req.file.path);
        res.json({
          success: true,
          data: {
            rawTextPreview: rawText.slice(0, 5000),
            allStudents: students,
          },
        });
      }
    } catch (err) {
      next(err);
    }
  }
}

export const gradeReportController = new GradeReportController();
