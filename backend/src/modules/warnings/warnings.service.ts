import path from 'path';
import fs from 'fs';
import { Prisma } from '@prisma/client';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { settingsService } from '../settings/settings.service';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { generateWarningPdf } from './pdfGenerator';
import { findBehaviorByCode, WARNING_BEHAVIORS, getBehaviorsByCategory, getSanctionScope } from './warningBehaviors';
import { normalizePhone } from '../notifications/notifications.service';

function fmtDate(date: Date): string {
  const d = new Date(date);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export class WarningsService {
  async getAll(page = 1, limit = 20, studentId?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.WrittenWarningWhereInput = {};
    if (studentId) where.studentId = studentId;
    if (search) {
      where.OR = [
        { student: { fullName: { contains: search } } },
        { student: { schoolNumber: { contains: search } } },
        { student: { className: { contains: search } } },
      ];
    }

    const [records, total] = await Promise.all([
      prisma.writtenWarning.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { issuedAt: 'desc' },
        ],
        include: {
          student: {
            select: { fullName: true, className: true, schoolNumber: true },
          },
        },
      }),
      prisma.writtenWarning.count({ where }),
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
    const record = await prisma.writtenWarning.findUnique({
      where: { id },
      include: {
        student: {
          select: { fullName: true, className: true, schoolNumber: true },
        },
      },
    });

    if (!record) {
      throw new AppError('Yazılı uyarı kaydı bulunamadı.', 404);
    }

    return record;
  }

  async getWarningCount(studentId: string): Promise<number> {
    return prisma.writtenWarning.count({ where: { studentId } });
  }

  async create(data: {
    studentId: string;
    behaviorCode: string;
    description?: string;
    guidanceNote?: string;
    issuedBy?: string;
    schoolName?: string;
    principalName?: string;
    classTeacherName?: string;
    schoolCounselorName?: string;
  }) {
    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
    });
    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    // Check behavior code
    const behavior = findBehaviorByCode(data.behaviorCode);
    if (!behavior) {
      throw new AppError('Geçersiz davranış kodu.', 400);
    }

    // Get next warning number and create record atomically to prevent race conditions
    const record = await prisma.$transaction(async (tx) => {
      const currentCount = await tx.writtenWarning.count({ where: { studentId: data.studentId } });
      const warningNumber = currentCount + 1;

      // Generate PDF (outside transaction is fine — file system op)
      const fileName = `uyari_${student.schoolNumber}_${warningNumber}_${Date.now()}.pdf`;
      const pdfPath = path.join(config.upload.dir, 'warnings', fileName);

      // Fetch school settings from DB if not provided
      const dbSettings = await settingsService.get();
      const schoolName = data.schoolName || dbSettings.schoolName || '';
      const principalName = data.principalName || dbSettings.principalName || '';

      await generateWarningPdf(
        {
          studentFullName: student.fullName,
          studentClassName: student.className,
          studentSchoolNumber: student.schoolNumber,
          warningNumber,
          behaviorText: behavior.text,
          behaviorArticle: behavior.article,
          behaviorSanctionScope: getSanctionScope(behavior.article),
          description: data.description,
          guidanceNote: data.guidanceNote,
          issuedBy: data.issuedBy || 'Okul Yönetimi',
          issuedAt: new Date(),
          schoolName,
          principalName,
          classTeacherName: data.classTeacherName,
          schoolCounselorName: data.schoolCounselorName,
        },
        pdfPath
      );

      return tx.writtenWarning.create({
        data: {
          studentId: data.studentId,
          warningNumber,
          behaviorCode: data.behaviorCode,
          behaviorText: behavior.text,
          description: data.description || null,
          guidanceNote: data.guidanceNote || null,
          classTeacherName: data.classTeacherName || null,
          schoolCounselorName: data.schoolCounselorName || null,
          pdfPath,
          issuedBy: data.issuedBy || 'Okul Yönetimi',
        },
        include: {
          student: { select: { fullName: true, className: true, schoolNumber: true } },
        },
      });
    });

    return record;
  }

  async servePdf(warningId: string): Promise<{ fullPath: string; student: { fullName: string; schoolNumber: string }; warningNumber: number }> {
    const record = await prisma.writtenWarning.findUnique({
      where: { id: warningId },
      include: {
        student: {
          select: { fullName: true, className: true, schoolNumber: true },
        },
      },
    });

    if (!record) {
      throw new AppError('Yazılı uyarı kaydı bulunamadı.', 404);
    }

    const uploadBase = path.resolve(config.upload.dir);
    const fullPath = path.resolve(record.pdfPath);
    if (!fullPath.startsWith(uploadBase + path.sep) && !fullPath.startsWith(uploadBase + '/')) {
      throw new AppError('Geçersiz dosya yolu.', 403);
    }

    // PDF dosyası diskte yoksa yeniden oluştur (ephemeral filesystem desteği)
    if (!fs.existsSync(fullPath)) {
      const behavior = findBehaviorByCode(record.behaviorCode);
      const dbSettings = await settingsService.get();

      await generateWarningPdf(
        {
          studentFullName: record.student.fullName,
          studentClassName: record.student.className,
          studentSchoolNumber: record.student.schoolNumber,
          warningNumber: record.warningNumber,
          behaviorText: record.behaviorText,
          behaviorArticle: behavior?.article,
          behaviorSanctionScope: behavior ? getSanctionScope(behavior.article) : undefined,
          description: record.description || undefined,
          guidanceNote: record.guidanceNote || undefined,
          classTeacherName: record.classTeacherName || undefined,
          schoolCounselorName: record.schoolCounselorName || undefined,
          issuedBy: record.issuedBy,
          issuedAt: record.issuedAt,
          schoolName: dbSettings.schoolName || '',
          principalName: dbSettings.principalName || '',
        },
        fullPath
      );
    }

    return { fullPath, student: record.student, warningNumber: record.warningNumber };
  }

  async getStats() {
    const total = await prisma.writtenWarning.count();
    // Students who have warnings
    const studentsWithWarnings = await prisma.writtenWarning.groupBy({
      by: ['studentId'],
    });
    return {
      total,
      studentsWithWarnings: studentsWithWarnings.length,
    };
  }

  async delete(id: string) {
    const record = await prisma.writtenWarning.findUnique({ where: { id } });
    if (!record) {
      throw new AppError('Yazılı uyarı kaydı bulunamadı.', 404);
    }

    await prisma.writtenWarning.delete({ where: { id } });

    // Delete PDF file
    const uploadBase = path.resolve(config.upload.dir);
    const fullPath = path.resolve(record.pdfPath);
    if (fullPath.startsWith(uploadBase + path.sep) || fullPath.startsWith(uploadBase + '/')) {
      try {
        await fs.promises.access(fullPath);
        await fs.promises.unlink(fullPath);
      } catch {
        // File already missing, ignore
      }
    }

    return { message: 'Yazılı uyarı kaydı başarıyla silindi.' };
  }

  getBehaviors() {
    return {
      all: WARNING_BEHAVIORS,
      byCategory: getBehaviorsByCategory(),
    };
  }

  /**
   * Yazılı uyarı için WhatsApp mesaj linki oluşturur.
   * Öğrencinin velisine/velilerine WhatsApp üzerinden uyarı bildirimi gönderir.
   */
  async getWhatsAppLink(warningId: string) {
    const record = await prisma.writtenWarning.findUnique({
      where: { id: warningId },
      include: {
        student: {
          include: {
            parents: {
              select: { fullName: true, phone: true },
            },
          },
        },
      },
    });

    if (!record) {
      throw new AppError('Yazılı uyarı kaydı bulunamadı.', 404);
    }

    const parents = record.student.parents;
    if (!parents || parents.length === 0) {
      throw new AppError('Bu öğrenciye tanımlı veli bulunamadı.', 404);
    }

    const message =
      `Sayın Veli,\n\n` +
      `Öğrenciniz ${record.student.fullName} (${record.student.className} sınıfı, ` +
      `No: ${record.student.schoolNumber}), ` +
      `aşağıda belirtilen davranış sebebiyle yazılı olarak uyarılmıştır.\n\n` +
      `Uyarı No: ${record.warningNumber}\n` +
      `Davranış: ${record.behaviorText}\n` +
      (record.description ? `Açıklama: ${record.description}\n` : '') +
      `Tarih: ${fmtDate(record.issuedAt)}\n\n` +
      `Bu uyarı, öğrencinin davranışlarını düzeltmesi amacıyla verilmiş olup, ` +
      `tekrarı halinde ilgili yönetmelik hükümleri doğrultusunda disiplin süreci başlatılacaktır.\n\n` +
      `Yazılı uyarı belgesi tarafınıza ayrıca iletilecektir.\n\n` +
      `Bilgilerinize arz ederiz.`;

    const encodedMessage = encodeURIComponent(message);

    const links = parents.map((p) => ({
      parentName: p.fullName,
      phone: p.phone,
      whatsappUrl: `https://wa.me/${normalizePhone(p.phone)}?text=${encodedMessage}`,
    }));

    return {
      warningId: record.id,
      studentName: record.student.fullName,
      warningNumber: record.warningNumber,
      parents: links,
    };
  }
}

export const warningsService = new WarningsService();
