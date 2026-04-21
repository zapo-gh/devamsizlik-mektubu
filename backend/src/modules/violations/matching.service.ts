import prisma from '../shared/utils/prisma';

/**
 * OCR'dan çıkan metni öğrenci veritabanıyla eşleştirme servisi.
 *
 * Eşleştirme stratejisi:
 * 1. Okul numarası ile tam eşleşme (en güvenilir)
 * 2. Ad-Soyad ile fuzzy eşleşme (Türkçe karakter toleranslı)
 */

interface MatchResult {
  studentId: string;
  schoolNumber: string;
  fullName: string;
  className: string;
  matchedBy: 'SCHOOL_NUMBER' | 'NAME_EXACT' | 'NAME_FUZZY';
  matchedText: string;      // OCR'dan eşleşen metin
  confidence: number;       // 0-100
}

export interface UnmatchedLine {
  text: string;
  reason: string;
}

/**
 * Türkçe karakterleri ASCII'ye dönüştürür (karşılaştırma için).
 */
function normalizeTurkish(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * İki metin arasındaki benzerlik oranını hesaplar (Levenshtein tabanlı).
 */
function similarity(a: string, b: string): number {
  const na = normalizeTurkish(a);
  const nb = normalizeTurkish(b);

  if (na === nb) return 100;
  if (na.length === 0 || nb.length === 0) return 0;

  // Token-based comparison (kelime sırasına bakma)
  const tokensA = na.split(/\s+/).filter(Boolean);
  const tokensB = nb.split(/\s+/).filter(Boolean);

  // Her A token'ı için en iyi B eşleşmesini bul
  let matchedTokens = 0;
  const totalTokens = Math.max(tokensA.length, tokensB.length);

  for (const ta of tokensA) {
    for (const tb of tokensB) {
      if (ta === tb || levenshtein(ta, tb) <= 1) {
        matchedTokens++;
        break;
      }
    }
  }

  return Math.round((matchedTokens / totalTokens) * 100);
}

/**
 * Levenshtein mesafesi
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * OCR satırlarını öğrenci veritabanıyla eşleştirir.
 */
export async function matchStudents(
  ocrLines: string[]
): Promise<{ matched: MatchResult[]; unmatched: UnmatchedLine[] }> {
  // Tüm aktif öğrencileri çek
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, schoolNumber: true, fullName: true, className: true },
  });

  const matched: MatchResult[] = [];
  const unmatched: UnmatchedLine[] = [];
  const matchedStudentIds = new Set<string>();

  for (const line of ocrLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let bestMatch: MatchResult | null = null;

    // 1. Okul numarası ile eşleştirme
    // Satırdaki sayıları bul (2-4 haneli)
    const numbers = trimmed.match(/\b(\d{2,4})\b/g);
    if (numbers) {
      for (const num of numbers) {
        const student = students.find((s) => s.schoolNumber === num);
        if (student && !matchedStudentIds.has(student.id)) {
          bestMatch = {
            studentId: student.id,
            schoolNumber: student.schoolNumber,
            fullName: student.fullName,
            className: student.className,
            matchedBy: 'SCHOOL_NUMBER',
            matchedText: trimmed,
            confidence: 100,
          };
          break;
        }
      }
    }

    // 2. Ad-soyad ile eşleştirme (numara eşleşmezse)
    if (!bestMatch) {
      // Sadece harflerden oluşan kısmı al
      const textOnly = trimmed.replace(/\d+/g, '').replace(/[^\p{L}\s]/gu, '').trim();
      if (textOnly.length < 3) {
        unmatched.push({ text: trimmed, reason: 'Çok kısa metin' });
        continue;
      }

      let highestSim = 0;
      let bestStudent: typeof students[0] | null = null;

      for (const student of students) {
        if (matchedStudentIds.has(student.id)) continue;

        // Tam eşleşme
        const normLine = normalizeTurkish(textOnly);
        const normName = normalizeTurkish(student.fullName);
        if (normLine === normName) {
          bestStudent = student;
          highestSim = 100;
          break;
        }

        // Fuzzy eşleşme
        const sim = similarity(textOnly, student.fullName);
        if (sim > highestSim) {
          highestSim = sim;
          bestStudent = student;
        }
      }

      if (bestStudent && highestSim >= 65) {
        bestMatch = {
          studentId: bestStudent.id,
          schoolNumber: bestStudent.schoolNumber,
          fullName: bestStudent.fullName,
          className: bestStudent.className,
          matchedBy: highestSim === 100 ? 'NAME_EXACT' : 'NAME_FUZZY',
          matchedText: trimmed,
          confidence: highestSim,
        };
      } else {
        unmatched.push({
          text: trimmed,
          reason: bestStudent
            ? `En yakın eşleşme: ${bestStudent.fullName} (%${highestSim})`
            : 'Eşleşme bulunamadı',
        });
      }
    }

    if (bestMatch) {
      matchedStudentIds.add(bestMatch.studentId);
      matched.push(bestMatch);
    }
  }

  return { matched, unmatched };
}

/**
 * Okul numaralarından direkt öğrenci eşleştirmesi yapar.
 * Manuel girişte kullanılır — sadece numaralarla çalışır, çok hızlıdır.
 */
export async function matchBySchoolNumbers(
  schoolNumbers: string[]
): Promise<{ matched: MatchResult[]; unmatched: UnmatchedLine[] }> {
  const students = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, schoolNumber: true, fullName: true, className: true },
  });

  const matched: MatchResult[] = [];
  const unmatched: UnmatchedLine[] = [];
  const matchedStudentIds = new Set<string>();

  for (const num of schoolNumbers) {
    const trimmed = num.trim();
    if (!trimmed) continue;

    const student = students.find((s) => s.schoolNumber === trimmed);
    if (student && !matchedStudentIds.has(student.id)) {
      matchedStudentIds.add(student.id);
      matched.push({
        studentId: student.id,
        schoolNumber: student.schoolNumber,
        fullName: student.fullName,
        className: student.className,
        matchedBy: 'SCHOOL_NUMBER',
        matchedText: trimmed,
        confidence: 100,
      });
    } else if (!student) {
      unmatched.push({ text: trimmed, reason: 'Bu numarada öğrenci bulunamadı' });
    }
  }

  return { matched, unmatched };
}

/**
 * Belirli bir öğrencinin belirli tipteki geçmiş ihlal sayısını döndürür.
 * Onaylanmış (confirmed) ihlalleri sayar.
 */
export async function getPreviousViolationCount(
  studentId: string,
  type: string
): Promise<number> {
  return prisma.dailyViolation.count({
    where: {
      studentId,
      type: type as any,
      isConfirmed: true,
    },
  });
}

/**
 * Birden fazla öğrenci için geçmiş ihlal sayılarını topluca getirir.
 */
export async function getBulkViolationCounts(
  studentIds: string[],
  type: string
): Promise<Map<string, number>> {
  const results = await prisma.dailyViolation.groupBy({
    by: ['studentId'],
    where: {
      studentId: { in: studentIds },
      type: type as any,
      isConfirmed: true,
    },
    _count: { id: true },
  });

  const counts = new Map<string, number>();
  for (const r of results) {
    counts.set(r.studentId, r._count.id);
  }
  return counts;
}
