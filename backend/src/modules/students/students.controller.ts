import { Request, Response, NextFunction } from 'express';
import { studentsService } from './students.service';
import { parseExcelFile, importStudents } from './excelImport.service';
import { parseParentExcel, importParents } from './parentImport.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const createStudentSchema = z.object({
  schoolNumber: z.string().min(1, 'Okul numarası gereklidir.'),
  fullName: z.string().min(1, 'Ad soyad gereklidir.'),
  className: z.string().min(1, 'Sınıf gereklidir.'),
  parents: z.array(z.object({
    fullName: z.string().min(1),
    phone: z.string().min(1),
  })).optional(),
});

const updateStudentSchema = z.object({
  fullName: z.string().min(1).optional(),
  className: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export class StudentsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await studentsService.getAll(page, limit, search);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await studentsService.getById(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = createStudentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await studentsService.create(parsed.data);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = updateStudentSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await studentsService.update(req.params.id, parsed.data);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await studentsService.delete(req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async assignParent(req: Request, res: Response, next: NextFunction) {
    try {
      const { parentId } = req.body;
      if (!parentId) {
        throw new AppError('Veli ID gereklidir.', 400);
      }

      const result = await studentsService.assignParent(req.params.id, parentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async updateParent(req: Request, res: Response, next: NextFunction) {
    try {
      const { fullName, phone } = req.body;
      const result = await studentsService.updateParent(req.params.parentId, { fullName, phone });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async removeParent(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await studentsService.removeParentFromStudent(req.params.id, req.params.parentId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /students/import-excel?mode=preview|import
   * Accepts multipart form with 'file' field (Excel .xlsx/.xls)
   */
  async importExcel(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('Excel dosyası gereklidir.', 400);
      }

      const mode = (req.query.mode as string) === 'import' ? 'import' : 'preview';
      const students = parseExcelFile(req.file.buffer);

      if (students.length === 0) {
        throw new AppError('Excel dosyasında öğrenci verisi bulunamadı.', 400);
      }

      const result = await importStudents(students, mode);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /students/import-parents?mode=preview|import
   * Accepts multipart form with 'file' field (Excel .xlsx/.xls)
   */
  async importParents(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('Excel dosyası gereklidir.', 400);
      }

      const mode = (req.query.mode as string) === 'import' ? 'import' : 'preview';
      const rows = parseParentExcel(req.file.buffer);

      if (rows.length === 0) {
        throw new AppError('Excel dosyasında veli verisi bulunamadı.', 400);
      }

      const result = await importParents(rows, mode);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const studentsController = new StudentsController();
