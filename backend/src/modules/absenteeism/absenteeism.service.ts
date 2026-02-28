import path from 'path';
import fs from 'fs';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { otpService } from '../otp/otp.service';
import { generateWhatsAppLink } from '../notifications/notifications.service';

export class AbsenteeismService {
  async getAll(page = 1, limit = 20, studentId?: string) {
    const skip = (page - 1) * limit;

    const where = studentId ? { studentId } : {};

    const [records, total] = await Promise.all([
      prisma.absenteeism.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { student: { className: 'asc' } },
          { student: { schoolNumber: 'asc' } },
        ],
        include: {
          student: {
            select: { fullName: true, className: true, schoolNumber: true },
          },
          _count: { select: { otpCodes: true } },
        },
      }),
      prisma.absenteeism.count({ where }),
    ]);

    return {
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const record = await prisma.absenteeism.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            fullName: true,
            className: true,
            schoolNumber: true,
            parents: { select: { id: true, fullName: true, phone: true } },
          },
        },
        otpCodes: {
          select: {
            id: true,
            parentPhone: true,
            isUsed: true,
            expiresAt: true,
            attemptCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    return record;
  }

  async create(data: { studentId: string; warningNumber: number; pdfPath: string }) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    return prisma.absenteeism.create({
      data,
      include: {
        student: { select: { fullName: true, className: true } },
      },
    });
  }

  async getWarningCount(studentId: string): Promise<number> {
    const count = await prisma.absenteeism.count({
      where: { studentId },
    });
    return count;
  }

  async generateOtpAndWhatsAppLink(absenteeismId: string, parentPhone: string, parentName: string = '') {
    const record = await prisma.absenteeism.findUnique({
      where: { id: absenteeismId },
      include: { student: { select: { fullName: true } } },
    });

    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    // Generate OTP
    const otpResult = await otpService.createOtp(absenteeismId, parentPhone);

    // Generate WhatsApp link with unique token
    const whatsappLink = generateWhatsAppLink(
      parentPhone,
      config.frontendDomain,
      otpResult.code,
      parentName,
      otpResult.token
    );

    return {
      otp: {
        code: otpResult.code,
        expiresAt: otpResult.expiresAt,
      },
      token: otpResult.token,
      whatsappLink,
      studentName: record.student.fullName,
    };
  }

  async servePdf(absenteeismId: string): Promise<string> {
    const record = await prisma.absenteeism.findUnique({
      where: { id: absenteeismId },
    });

    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    const fullPath = path.resolve(record.pdfPath);
    if (!fs.existsSync(fullPath)) {
      throw new AppError('Dosya bulunamadı.', 404);
    }

    return fullPath;
  }

  async getStats() {
    const [total, viewedCount, pendingCount] = await Promise.all([
      prisma.absenteeism.count(),
      prisma.absenteeism.count({ where: { viewedByParent: true } }),
      prisma.absenteeism.count({ where: { viewedByParent: false } }),
    ]);
    return { total, viewedCount, pendingCount };
  }

  async delete(id: string) {
    const record = await prisma.absenteeism.findUnique({ where: { id } });
    if (!record) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    // Delete DB record first, then file (to avoid data loss if DB fails)
    await prisma.absenteeism.delete({ where: { id } });

    // Delete file from disk
    const fullPath = path.resolve(record.pdfPath);
    try {
      await fs.promises.access(fullPath);
      await fs.promises.unlink(fullPath);
    } catch {
      // File already missing, ignore
    }

    return { message: 'Devamsızlık kaydı başarıyla silindi.' };
  }
}

export const absenteeismService = new AbsenteeismService();
