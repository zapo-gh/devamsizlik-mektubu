import path from 'path';
import fs from 'fs';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { extractTextFromImage, parseOcrLines, parseManualInput } from './ocr.service';
import { matchStudents, matchBySchoolNumbers, getBulkViolationCounts } from './matching.service';

// İhlal tipi → Yazılı uyarı davranış kodu eşleşmesi
const VIOLATION_TO_BEHAVIOR: Record<string, string> = {
  KIYAFET: 'M164_1_C',
  TOREN_GEC: 'M164_1_F',
  DIGER: 'M164_1_B',
};

// İhlal tipi açıklamaları
const VIOLATION_LABELS: Record<string, string> = {
  KIYAFET: 'Kıyafet / Makyaj Kontrolü',
  TOREN_GEC: 'Tören Geç Kalma',
  DIGER: 'Diğer İhlal',
};

export class ViolationsService {
  /**
   * Fotoğraf yükle → OCR → Öğrenci eşleştir → Kaydet.
   * İşlem sonucunda eşleşen/eşleşemeyen öğrenciler ve tekrar eden ihlaller döner.
   */
  async processUpload(data: {
    imagePath: string;
    type: string;
    description?: string;
    uploadedBy?: string;
    violationDate?: string;
  }) {
    // 1. OCR ile metin çıkar
    let rawText: string;
    try {
      rawText = await extractTextFromImage(data.imagePath);
    } catch (error: any) {
      throw new AppError(`OCR işlemi başarısız: ${error.message}`, 500);
    }

    if (!rawText || rawText.trim().length < 3) {
      throw new AppError('Fotoğraftan metin okunamadı. Lütfen daha net bir fotoğraf yükleyin.', 400);
    }

    // 2. Metni satırlara ayır
    const lines = parseOcrLines(rawText);
    if (lines.length === 0) {
      throw new AppError('Fotoğraftan öğrenci bilgisi çıkarılamadı.', 400);
    }

    // 3. Öğrenci eşleştirme
    const { matched, unmatched } = await matchStudents(lines);

    // 4. Upload kaydı oluştur
    const vDate = data.violationDate ? new Date(data.violationDate) : new Date();
    const upload = await prisma.violationUpload.create({
      data: {
        type: data.type as any,
        description: data.description || null,
        imagePath: data.imagePath,
        ocrRawText: rawText,
        uploadedBy: data.uploadedBy || 'Okul Yönetimi',
        violationDate: vDate,
      },
    });

    // 5. Eşleşen öğrenciler için DailyViolation kayıtları oluştur
    const createdRecords = [];
    for (const m of matched) {
      try {
        const record = await prisma.dailyViolation.create({
          data: {
            studentId: m.studentId,
            uploadId: upload.id,
            type: data.type as any,
            violationDate: vDate,
            matchedBy: m.matchedBy,  // SCHOOL_NUMBER | NAME_EXACT | NAME_FUZZY
            isConfirmed: false,  // Admin onayı bekleyecek
          },
          include: {
            student: {
              select: { fullName: true, className: true, schoolNumber: true },
            },
          },
        });
        createdRecords.push({
          ...record,
          matchedText: m.matchedText,
          matchedBy: m.matchedBy,
          confidence: m.confidence,
        });
      } catch (error: any) {
        // Duplicate hatasını yut (aynı öğrenci aynı upload'da)
        if (error.code === 'P2002') continue;
        throw error;
      }
    }

    // 6. Geçmiş ihlal say - tekrar edenleri bul
    const studentIds = createdRecords.map((r) => r.studentId);
    const prevCounts = await getBulkViolationCounts(studentIds, data.type);

    // 7. Bu ihlal tipine karşılık gelen davranış kodu için yazılı uyarı almış öğrencileri bul
    const behaviorCode = VIOLATION_TO_BEHAVIOR[data.type] || 'M164_1_B';
    const existingWarnings = await prisma.writtenWarning.findMany({
      where: { studentId: { in: studentIds }, behaviorCode },
      select: { studentId: true },
    });
    const warnedStudentIds = new Set(existingWarnings.map((w) => w.studentId));

    // Sonuçları zenginleştir
    const enrichedRecords = createdRecords.map((r) => {
      const prevCount = prevCounts.get(r.studentId) || 0;
      const requiresDiscipline = warnedStudentIds.has(r.studentId);
      return {
        id: r.id,
        studentId: r.studentId,
        student: r.student,
        matchedText: r.matchedText,
        matchedBy: r.matchedBy,
        confidence: r.confidence,
        previousViolations: prevCount,
        suggestWarning: prevCount >= 2, // 3. veya daha fazla ihlal → uyarı öner
        requiresDiscipline,             // Daha önce yazılı uyarı almış → disiplin süreci
      };
    });

    return {
      uploadId: upload.id,
      ocrRawText: rawText,
      ocrLines: lines,
      type: data.type,
      typeLabel: VIOLATION_LABELS[data.type] || data.type,
      violationDate: vDate.toISOString(),
      matched: enrichedRecords,
      unmatched,
      summary: {
        totalLines: lines.length,
        matchedCount: enrichedRecords.length,
        unmatchedCount: unmatched.length,
        repeatOffenders: enrichedRecords.filter((r) => r.suggestWarning && !r.requiresDiscipline).length,
        disciplineRequired: enrichedRecords.filter((r) => r.requiresDiscipline).length,
      },
    };
  }

  /**
   * Eşleştirilen ihlalleri onayla (admin onayı).
   */
  async confirmViolations(uploadId: string, violationIds: string[]) {
    // Tüm seçili violationları onayla
    const updated = await prisma.dailyViolation.updateMany({
      where: {
        id: { in: violationIds },
        uploadId,
      },
      data: { isConfirmed: true },
    });

    return { confirmedCount: updated.count };
  }

  /**
   * Belirli bir ihlalı sil (yanlış eşleşme).
   */
  async removeViolation(violationId: string) {
    const record = await prisma.dailyViolation.findUnique({ where: { id: violationId } });
    if (!record) {
      throw new AppError('İhlal kaydı bulunamadı.', 404);
    }
    await prisma.dailyViolation.delete({ where: { id: violationId } });
    return { message: 'İhlal kaydı silindi.' };
  }

  /**
   * Manuel öğrenci ekleme (OCR bulamadıysa).
   */
  async addManualViolation(data: {
    uploadId: string;
    studentId: string;
    type: string;
    violationDate?: string;
  }) {
    const upload = await prisma.violationUpload.findUnique({ where: { id: data.uploadId } });
    if (!upload) {
      throw new AppError('Upload kaydı bulunamadı.', 404);
    }

    const student = await prisma.student.findUnique({ where: { id: data.studentId } });
    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    try {
      const record = await prisma.dailyViolation.create({
        data: {
          studentId: data.studentId,
          uploadId: data.uploadId,
          type: data.type as any,
          violationDate: data.violationDate ? new Date(data.violationDate) : upload.violationDate,
          matchedBy: 'MANUAL',
          isConfirmed: false,
        },
        include: {
          student: { select: { fullName: true, className: true, schoolNumber: true } },
        },
      });

      // Geçmiş ihlal sayısı
      const prevCount = await prisma.dailyViolation.count({
        where: {
          studentId: data.studentId,
          type: data.type as any,
          isConfirmed: true,
        },
      });

      // Yazılı uyarı kontrolü
      const behaviorCodeAdd = VIOLATION_TO_BEHAVIOR[data.type] || 'M164_1_B';
      const existingWarningAdd = await prisma.writtenWarning.findFirst({
        where: { studentId: data.studentId, behaviorCode: behaviorCodeAdd },
        select: { id: true },
      });

      return {
        ...record,
        matchedBy: 'MANUAL',
        confidence: 100,
        previousViolations: prevCount,
        suggestWarning: prevCount >= 2,
        requiresDiscipline: !!existingWarningAdd,
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new AppError('Bu öğrenci zaten bu yükleme için kayıtlı.', 409);
      }
      throw error;
    }
  }

  /**
   * Tüm upload'ları listele (son yüklemeler).
   */
  async getUploads(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [records, total] = await Promise.all([
      prisma.violationUpload.findMany({
        skip,
        take: limit,
        orderBy: { violationDate: 'desc' },
        include: {
          _count: { select: { records: true } },
          records: {
            include: {
              student: { select: { fullName: true, className: true, schoolNumber: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      prisma.violationUpload.count(),
    ]);

    return {
      records: records.map((r) => ({
        ...r,
        studentCount: r._count.records,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Upload detayı — öğrenci eşleşmeleriyle birlikte.
   */
  async getUploadDetail(uploadId: string) {
    const upload = await prisma.violationUpload.findUnique({
      where: { id: uploadId },
      include: {
        records: {
          include: {
            student: { select: { fullName: true, className: true, schoolNumber: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!upload) {
      throw new AppError('Upload kaydı bulunamadı.', 404);
    }

    // Her öğrenci için geçmiş ihlal sayısını hesapla (mevcut yüklemeyi dışla)
    const studentIds = upload.records.map((r) => r.studentId);
    const prevCounts = await getBulkViolationCounts(studentIds, upload.type, upload.id);

    // Bu yükleme tipine karşılık gelen davranış kodu
    const behaviorCode = VIOLATION_TO_BEHAVIOR[upload.type] || 'M164_1_B';

    // Bu öğrencilerden hangilerinin ilgili davranış koduna ait uyarısı var?
    const existingWarnings = await prisma.writtenWarning.findMany({
      where: { studentId: { in: studentIds }, behaviorCode },
      select: { studentId: true },
    });
    const warnedStudentIds = new Set(existingWarnings.map((w) => w.studentId));

    const enrichedRecords = upload.records.map((r) => {
      const prevCount = prevCounts.get(r.studentId) || 0;
      return {
        ...r,
        previousViolations: prevCount,
        suggestWarning: prevCount >= 2,
        hasWarning: warnedStudentIds.has(r.studentId),
        requiresDiscipline: warnedStudentIds.has(r.studentId),
      };
    });

    return {
      ...upload,
      records: enrichedRecords,
    };
  }

  /**
   * Tüm ihlal istatistiklerini getir.
   */
  async getStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const [totalUploads, totalViolations, confirmedViolations, todayCount, weekCount] = await Promise.all([
      prisma.violationUpload.count(),
      prisma.dailyViolation.count(),
      prisma.dailyViolation.count({ where: { isConfirmed: true } }),
      prisma.dailyViolation.count({ where: { violationDate: { gte: todayStart } } }),
      prisma.dailyViolation.count({ where: { violationDate: { gte: weekStart } } }),
    ]);

    // En çok ihlaili öğrenciler
    const topOffenders = await prisma.dailyViolation.groupBy({
      by: ['studentId'],
      where: { isConfirmed: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Öğrenci bilgilerini ekle
    const studentIds = topOffenders.map((t) => t.studentId);
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, fullName: true, className: true, schoolNumber: true },
    });

    const studentMap = new Map(students.map((s) => [s.id, s]));

    return {
      totalUploads,
      totalViolations,
      todayCount,
      weekCount,
      confirmedViolations,
      topOffenders: topOffenders.map((t) => ({
        student: studentMap.get(t.studentId),
        violationCount: t._count.id,
      })),
    };
  }

  /**
   * Öğrencinin tüm ihlal geçmişini getir.
   */
  async getStudentHistory(studentId: string) {
    const [student, violations, existingWarnings] = await Promise.all([
      prisma.student.findUnique({
        where: { id: studentId },
        select: { fullName: true, className: true, schoolNumber: true },
      }),
      prisma.dailyViolation.findMany({
        where: { studentId },
        include: {
          upload: { select: { type: true, description: true, violationDate: true, createdAt: true } },
        },
        orderBy: { violationDate: 'desc' },
      }),
      prisma.writtenWarning.findMany({
        where: { studentId },
        select: { id: true, behaviorCode: true, issuedAt: true, warningNumber: true },
        orderBy: { issuedAt: 'desc' },
      }),
    ]);

    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);

    // Her ihlal tipi için onaylı ihlal sayısını hesapla
    const confirmedViolations = violations.filter((v) => v.isConfirmed);
    const violationsByType: Record<string, number> = {};
    for (const v of confirmedViolations) {
      violationsByType[v.type] = (violationsByType[v.type] || 0) + 1;
    }

    // Mevcut uyarıların davranış kodları
    const warnedBehaviorCodes = new Set(existingWarnings.map((w) => w.behaviorCode));

    // Tür bazında uyarı önerileri
    const warningSuggestions = Object.entries(violationsByType)
      .filter(([, count]) => count >= 2)
      .map(([type, count]) => {
        const behaviorCode = VIOLATION_TO_BEHAVIOR[type] || 'M164_1_B';
        return {
          type,
          confirmedCount: count,
          behaviorCode,
          hasWarning: warnedBehaviorCodes.has(behaviorCode),
        };
      });

    return {
      student,
      violations,
      total: violations.length,
      confirmed: confirmedViolations.length,
      violationsByType,
      warningSuggestions,
      existingWarnings,
    };
  }

  /**
   * Belirli tipdeki davranış kodunu döndürür (uyarı oluşturmak için).
   */
  getBehaviorCodeForType(type: string): string {
    return VIOLATION_TO_BEHAVIOR[type] || 'M164_1_B';
  }

  getViolationLabel(type: string): string {
    return VIOLATION_LABELS[type] || type;
  }

  /**
   * Upload ve ilişkili tüm ihlal kayıtlarını sil.
   */
  async deleteUpload(uploadId: string) {
    const upload = await prisma.violationUpload.findUnique({ where: { id: uploadId } });
    if (!upload) {
      throw new AppError('Yükleme kaydı bulunamadı.', 404);
    }

    // Önce ilişkili DailyViolation kayıtlarını sil
    const deleted = await prisma.dailyViolation.deleteMany({
      where: { uploadId },
    });

    // Sonra upload kaydını sil
    await prisma.violationUpload.delete({ where: { id: uploadId } });

    // Fotoğraf dosyasını sil (varsa)
    if (upload.imagePath) {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(upload.imagePath);
      if (fs.existsSync(fullPath)) {
        try { fs.unlinkSync(fullPath); } catch {}
      }
    }

    return { message: 'Yükleme ve ilişkili kayıtlar silindi.', deletedViolations: deleted.count };
  }

  /**
   * Manuel metin/numara girişi ile ihlal işle.
   * OCR başarısız olduğunda admin elle okul numaralarını girer.
   */
  async processManualText(data: {
    text: string;
    type: string;
    description?: string;
    uploadedBy?: string;
    violationDate?: string;
  }) {
    // 1. Girişi parse et
    const parsedLines = parseManualInput(data.text);
    if (parsedLines.length === 0) {
      throw new AppError('Metin girdisi boş veya geçersiz. Lütfen okul numaralarını girin.', 400);
    }

    // 2. Tüm girişler numara mı kontrol et
    const allNumbers = parsedLines.every((l) => /^\d{1,4}$/.test(l.trim()));

    // 3. Eşleştir — numaralarsa direkt numara eşleştirme, değilse genel eşleştirme
    let matchResult;
    if (allNumbers) {
      matchResult = await matchBySchoolNumbers(parsedLines);
    } else {
      matchResult = await matchStudents(parsedLines);
    }

    const { matched, unmatched } = matchResult;

    // 4. Upload kaydı oluştur (fotoğrafsız, sadece metin bazlı)
    const vDate = data.violationDate ? new Date(data.violationDate) : new Date();
    const upload = await prisma.violationUpload.create({
      data: {
        type: data.type as any,
        description: data.description || 'Manuel giriş',
        imagePath: '',   // Fotoğraf yok
        ocrRawText: data.text,
        uploadedBy: data.uploadedBy || 'Okul Yönetimi',
        violationDate: vDate,
      },
    });

    // 5. Eşleşen öğrenciler için DailyViolation kayıtları oluştur
    const createdRecords = [];
    for (const m of matched) {
      try {
        const record = await prisma.dailyViolation.create({
          data: {
            studentId: m.studentId,
            uploadId: upload.id,
            type: data.type as any,
            violationDate: vDate,
            matchedBy: 'MANUAL',
            isConfirmed: false,
          },
          include: {
            student: {
              select: { fullName: true, className: true, schoolNumber: true },
            },
          },
        });
        createdRecords.push({
          ...record,
          matchedText: m.matchedText,
          matchedBy: m.matchedBy,
          confidence: m.confidence,
        });
      } catch (error: any) {
        if (error.code === 'P2002') continue;
        throw error;
      }
    }

    // 6. Geçmiş ihlal say
    const studentIds = createdRecords.map((r) => r.studentId);
    const prevCounts = await getBulkViolationCounts(studentIds, data.type);

    // 7. Yazılı uyarı almış öğrencileri bul
    const behaviorCodeManual = VIOLATION_TO_BEHAVIOR[data.type] || 'M164_1_B';
    const existingWarningsManual = await prisma.writtenWarning.findMany({
      where: { studentId: { in: studentIds }, behaviorCode: behaviorCodeManual },
      select: { studentId: true },
    });
    const warnedStudentIdsManual = new Set(existingWarningsManual.map((w) => w.studentId));

    const enrichedRecords = createdRecords.map((r) => {
      const prevCount = prevCounts.get(r.studentId) || 0;
      const requiresDiscipline = warnedStudentIdsManual.has(r.studentId);
      return {
        id: r.id,
        studentId: r.studentId,
        student: r.student,
        matchedText: r.matchedText,
        matchedBy: r.matchedBy,
        confidence: r.confidence,
        previousViolations: prevCount,
        suggestWarning: prevCount >= 2,
        requiresDiscipline,
      };
    });

    return {
      uploadId: upload.id,
      ocrRawText: data.text,
      ocrLines: parsedLines,
      type: data.type,
      typeLabel: VIOLATION_LABELS[data.type] || data.type,
      violationDate: vDate.toISOString(),
      matched: enrichedRecords,
      unmatched,
      summary: {
        totalLines: parsedLines.length,
        matchedCount: enrichedRecords.length,
        unmatchedCount: unmatched.length,
        repeatOffenders: enrichedRecords.filter((r) => r.suggestWarning && !r.requiresDiscipline).length,
        disciplineRequired: enrichedRecords.filter((r) => r.requiresDiscipline).length,
      },
    };
  }
}

export const violationsService = new ViolationsService();
