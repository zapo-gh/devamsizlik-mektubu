import { Request, Response, NextFunction } from 'express';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

/**
 * Returns the source upload for a single student violation.
 * Kept separate from the existing service to avoid coupling the 360 view
 * to OCR/upload processing logic.
 */
export async function getViolationSource(req: Request, res: Response, next: NextFunction) {
  try {
    const violation = await prisma.dailyViolation.findUnique({
      where: { id: req.params.violationId },
      select: {
        id: true,
        studentId: true,
        type: true,
        violationDate: true,
        isConfirmed: true,
        matchedBy: true,
        upload: {
          select: {
            id: true,
            type: true,
            description: true,
            imagePath: true,
            ocrRawText: true,
            uploadedBy: true,
            violationDate: true,
            createdAt: true,
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
            schoolNumber: true,
            className: true,
          },
        },
      },
    });

    if (!violation) throw new AppError('İhlal kaydı bulunamadı.', 404);

    res.json({ success: true, data: violation });
  } catch (error) {
    next(error);
  }
}
