import path from 'path';
import crypto from 'crypto';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { parseKarnePdf, ParsedKarneStudent } from './karneParser.service';
import { parseKarneExcel } from './karneExcelParser.service';
import { generateGradeReportPdf } from './gradeReportPdf.generator';
import { settingsService } from '../settings/settings.service';

/** Türkçe isim normalizasyonu: büyük harf, aksanları kaldır */
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
    .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein mesafesi */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Öğrenciyi DB'de ara: önce okul no, sonra isim benzerliği */
async function findStudentInDb(parsed: ParsedKarneStudent, className: string) {
  // 1. Okul numarasıyla direkt ara
  if (parsed.schoolNumber) {
    const byNo = await prisma.student.findUnique({
      where: { schoolNumber: parsed.schoolNumber },
    });
    if (byNo) return byNo;
  }

  // 2. TC Kimlik ile ara (fullName alanı yok ama notlar varsa)
  // (TC kimlik DB'de tutulmuyor; ilerisi için placeholder)

  // 3. İsim benzerliği ile ara (tüm aktif öğrenciler içinde)
  const allStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
  });

  const parsedNorm = normalizeName(parsed.fullName);
  let best: typeof allStudents[0] | null = null;
  let bestDist = Infinity;

  for (const s of allStudents) {
    const dist = levenshtein(normalizeName(s.fullName), parsedNorm);
    if (dist < bestDist) {
      bestDist = dist;
      best = s;
    }
  }

  // Makul eşik: 3 veya daha az düzenleme mesafesi
  if (best && bestDist <= 3) return best;
  return null;
}

class GradeReportService {

  /**
   * Karne Excel veya PDF'ini yükle, analiz et, 3+ başarısız öğrencileri tespit et.
   * Henüz PDF üretmez — kullanıcı onayından sonra generatePdfs() çağrılır.
   */
  async analyzeKarne(filePath: string, schoolYear: string, meetingDate: Date, source: 'pdf' | 'excel' = 'pdf') {
    let students: ParsedKarneStudent[];
    let rawText = '';

    if (source === 'excel') {
      const all = parseKarneExcel(filePath);
      students = all.filter(s => s.failedSubjects.length > 3);
    } else {
      const result = await parseKarnePdf(filePath);
      students = result.students;
      rawText = result.rawText;
    }

    if (students.length === 0) {
      throw new AppError(
        '3 veya daha fazla başarısız dersi olan öğrenci tespit edilemedi. ' +
        'Lütfen dosya formatını kontrol edin.',
        422,
      );
    }

    // Sınıfı tespit et (çoğunluk oyu)
    const classVotes: Record<string, number> = {};
    for (const s of students) {
      if (s.className) classVotes[s.className] = (classVotes[s.className] || 0) + 1;
    }
    const className = Object.entries(classVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

    // DB kaydı oluştur
    const report = await prisma.gradeReport.create({
      data: {
        className,
        schoolYear,
        meetingDate,
        karneText: rawText.slice(0, 50000), // max 50kb
      },
    });

    // Aynı sınıfa ait mevcut (arşivlenmemiş) rapor var mı kontrol et
    const existingReport = await prisma.gradeReport.findFirst({
      where: {
        className,
        archived: false,
        id: { not: report.id },
      },
      select: { id: true, uploadedAt: true, meetingDate: true },
    });

    // Her öğrenci için DB öğrencisi bul ve GradeReportStudent kaydı oluştur
    const createdStudents = [];
    for (const parsed of students) {
      const dbStudent = await findStudentInDb(parsed, className);

      const rec = await prisma.gradeReportStudent.create({
        data: {
          reportId:      report.id,
          studentId:     dbStudent?.id ?? null,
          fullName:      parsed.fullName,
          className:     parsed.className || className,
          tcKimlikNo:    parsed.tcKimlikNo,
          schoolNumber:  parsed.schoolNumber || dbStudent?.schoolNumber,
          failedSubjects: JSON.stringify(parsed.failedSubjects),
        },
      });

      createdStudents.push({
        ...rec,
        failedSubjects: parsed.failedSubjects,
        dbStudentName: dbStudent?.fullName,
        matched: !!dbStudent,
      });
    }

    return {
      reportId: report.id,
      className,
      studentCount: students.length,
      students: createdStudents,
      existingReportId: existingReport?.id ?? null,
    };
  }

  /**
   * Analiz edilmiş rapor için tüm (veya belirli) öğrencilerin PDF'ini üret.
   */
  async generatePdfs(reportId: string, studentIds?: string[]) {
    const report = await prisma.gradeReport.findUnique({
      where: { id: reportId },
      include: { students: true },
    });
    if (!report) throw new AppError('Rapor bulunamadı.', 404);

    const settings = await settingsService.get();

    // Müdür yardımcısı ve rehber öğretmen tek seferde getir
    const [vicePrincipal, counselor] = await Promise.all([
      prisma.staff.findFirst({ where: { role: 'MUDUR_YARDIMCISI', isActive: true } }),
      prisma.staff.findFirst({ where: { role: 'REHBER_OGRETMEN',   isActive: true } }),
    ]);

    // Sınıf rehber öğretmenlerini önbelleğe al (formatı normalleştirerek eşleştir)
    const allClassTeachers = await prisma.staff.findMany({
      where: { role: 'SINIF_REHBER_OGRETMEN', isActive: true },
    });

    /**
     * "9/A", "9-A", "9 A", "9A" gibi farklı formatlarda saklanan className'leri
     * normalize ederek karşılaştır.
     */
    function normalizeClass(cn: string): string {
      return cn.toLocaleUpperCase('tr-TR').replace(/[\s\-\/]+/g, '');
    }

    function findClassTeacher(stuClassName: string) {
      const norm = normalizeClass(stuClassName);
      return allClassTeachers.find(t => t.className && normalizeClass(t.className) === norm);
    }

    const targets = studentIds
      ? report.students.filter(s => studentIds.includes(s.id))
      : report.students;

    const results: { id: string; name: string; pdfPath: string | null; error?: string }[] = [];

    for (const stu of targets) {
      try {
        // Veliyi bul (eşleşen öğrenci varsa)
        let parentFullName: string | undefined;
        let parentPhone: string | undefined;
        if (stu.studentId) {
          const parent = await prisma.parent.findFirst({
            where: { students: { some: { id: stu.studentId } } },
          });
          if (parent) {
            parentFullName = parent.fullName;
            parentPhone    = parent.phone;
          }
        }

        // Bu öğrenciye ait sınıf rehber öğretmenini bul
        // GradeReportStudent.className boşsa report.className'i fallback olarak kullan
        const effectiveClassName = stu.className || report.className;
        const classTeacher = findClassTeacher(effectiveClassName);

        const unique   = crypto.randomBytes(8).toString('hex');
        const fileName = `grade-report-${Date.now()}-${unique}.pdf`;
        const outputPath = path.join(path.resolve(config.upload.dir), fileName);

        await generateGradeReportPdf(
          {
            studentFullName:  stu.fullName,
            studentClassName: effectiveClassName,
            studentSchoolNumber: stu.schoolNumber ?? undefined,
            studentTcKimlikNo:   stu.tcKimlikNo  ?? undefined,
            parentFullName,
            parentPhone,
            failedSubjects: JSON.parse(stu.failedSubjects) as { subject: string; grade: number }[],
            schoolName:    settings.schoolName || 'Okul Adı',
            districtName:  undefined,
            schoolYear:    report.schoolYear,
            meetingDate:   report.meetingDate,
            vicePrincipalName: vicePrincipal?.name,
            counselorName:     counselor?.name,
            classTeacherName:  classTeacher?.name,
          },
          outputPath,
        );

        await prisma.gradeReportStudent.update({
          where: { id: stu.id },
          data:  { pdfPath: outputPath },
        });

        results.push({ id: stu.id, name: stu.fullName, pdfPath: outputPath });
      } catch (err: any) {
        results.push({ id: stu.id, name: stu.fullName, pdfPath: null, error: err?.message });
      }
    }

    return results;
  }

  /** Tüm raporları listele (arşivlenmemiş, sınıfa göre artan sıra) */
  async listReports() {
    return prisma.gradeReport.findMany({
      where: { archived: false },
      orderBy: { className: 'asc' },
      include: { _count: { select: { students: true } } },
    });
  }

  /** Arşivlenmiş raporları listele */
  async listArchivedReports() {
    return prisma.gradeReport.findMany({
      where: { archived: true },
      orderBy: { className: 'asc' },
      include: { _count: { select: { students: true } } },
    });
  }

  /** Tek raporu getir (öğrencilerle birlikte) */
  async getReport(id: string) {
    const report = await prisma.gradeReport.findUnique({
      where: { id },
      include: {
        students: {
          include: { student: true },
          orderBy: { fullName: 'asc' },
        },
      },
    });
    if (!report) throw new AppError('Rapor bulunamadı.', 404);

    return {
      ...report,
      students: report.students.map(s => ({
        ...s,
        failedSubjects: JSON.parse(s.failedSubjects) as { subject: string; grade: number }[],
      })),
    };
  }

  /** Raporu arşivle */
  async archiveReport(id: string) {
    const report = await prisma.gradeReport.findUnique({ where: { id } });
    if (!report) throw new AppError('Rapor bulunamadı.', 404);
    return prisma.gradeReport.update({ where: { id }, data: { archived: true } });
  }

  /** Raporu sil */
  async deleteReport(id: string) {
    const report = await prisma.gradeReport.findUnique({ where: { id } });
    if (!report) throw new AppError('Rapor bulunamadı.', 404);
    await prisma.gradeReport.delete({ where: { id } });
  }

  /** Öğrencinin PDF yolunu getir (indir/görüntüle) */
  async getStudentPdfPath(studentRecordId: string): Promise<string> {
    const rec = await prisma.gradeReportStudent.findUnique({ where: { id: studentRecordId } });
    if (!rec || !rec.pdfPath) throw new AppError('PDF bulunamadı.', 404);
    return rec.pdfPath;
  }

  /** Öğrenci eşleşmesini manuel güncelle */
  async updateStudentMatch(studentRecordId: string, studentId: string | null) {
    return prisma.gradeReportStudent.update({
      where: { id: studentRecordId },
      data: { studentId },
    });
  }
}

export const gradeReportService = new GradeReportService();
