import fs from 'fs';

// mupdf ESM-only → Function trick ile dynamic import
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
let mupdfLib: any = null;

async function getMupdf(): Promise<any> {
  if (!mupdfLib) {
    const mod = await _dynamicImport('mupdf');
    mupdfLib = mod.default ?? mod;
  }
  return mupdfLib;
}

export interface ParsedGrade {
  subject: string;
  grade: number;
}

export interface ParsedKarneStudent {
  fullName: string;
  className: string;
  tcKimlikNo?: string;
  schoolNumber?: string;
  grades: ParsedGrade[];
  failedSubjects: ParsedGrade[];
}

// ── Sabitler ─────────────────────────────────────────────────────────────────

const NUMBER_RE = /^-?\d+([.,]\d+)?$/;

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

// Bilinen başlık/etiket satırları - ders adı DEĞİL
const HEADER_SKIP = new Set([
  'DERSLER', 'PUAN', 'DÜZENİ', 'PUAN DÜZENİ', 'SONUÇ', 'SONUC',
  'DERECE', 'HAFTALIK', 'DÖNEM', 'DONEM', 'SAATI', 'SAYISI',
  'AĞIRLIKLI', 'AGIRLIKLI', 'ÖNCEKİ', 'ONCEKI',
  'YIL', 'SONU', 'SINIF', 'SINIFI', 'ŞUBE', 'ŞUBESİ',
  'BAŞARI', 'BASARI', 'DURUMU', 'OKUL', 'OKULU', 'NUMARASI',
  'ÖĞRENCİNİN', 'ADI', 'SOYADI', 'ALAN', 'DALI',
  'İL', 'İLİ', 'İLÇE', 'İLÇESİ', 'DERS', 'YILI',
  'DOĞRUDAN', 'ORTALAMA', 'SORUMLU', 'GEÇTİ', 'PEKİYİ', 'İYİ',
  'ORTA', 'GEÇER', 'GEÇMEZ', 'TAMAMLADI', 'TAMAMLAMADI', 'MUAF',
  'REHBERİN', 'GÖRÜŞÜ', 'STAJ', 'ÇALIŞMALARINI', 'GÖRÜŞLERİ',
  'TOPLAM', 'GENEL', 'BAŞARISI', 'ORTALAMASI', 'PUANI',
  'DEVAMSIZLIK', 'GELİŞİM', 'RAPORU', 'ÖZÜRLÜ', 'ÖZÜRSÜZ',
  'DAVRANIŞLAR', 'İMZALAR', 'NOTU',
  'VE', 'İLE', 'VEYA',
]);

/** Ders adına özgü kelimeler — bu kelimeleri içeren satır kişi adı olamaz */
const SUBJECT_WORD_RE = /^(EDEBİYATI|BİLGİSİ|TARİHİ|COĞRAFYASI|FİZİĞİ|KİMYASI|BİYOLOJİSİ|EĞİTİMİ|DERSİ|KURAMI|UYGULAMASI|UYGULAMALAR|ATÖLYESİ|SEÇMELİ|HAYATINDA|KÜLTÜRÜ|BECERİSİ|ÇALIŞMASI|GELİŞİMİ|ANALİZİ|TEKNOLOJİSİ|SAĞLIĞI|GÜVENLİĞİ|YÖNETİMİ|KAVRAMLARI|İLKELERİ|MESLEKİ|TEMEL|ANATOMİ|FİZYOLOJİ|SPOR|SANATLAR|MÜZİK|AHLÂK|AHLAK)$/;

function isSubjectName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  if (/\d/.test(trimmed)) return false;
  if (HEADER_SKIP.has(trimmed)) return false;
  const upperCount = (trimmed.match(/[A-ZÇĞİÖŞÜ]/g) || []).length;
  const lowerCount = (trimmed.match(/[a-zçğışöşü]/g) || []).length;
  return upperCount >= 2 && upperCount > lowerCount;
}

/** Kişi adı mı? Ders adı kelimesi içermemeli, "VE" gibi bağlaç içermemeli */
function isFullName(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (!/[A-ZÇĞİÖŞÜ]/.test(line)) return false;
  if (words.some(w => w === 'VE' || w === 'İLE' || w === 'VEYA')) return false;
  if (words.some(w => SUBJECT_WORD_RE.test(w))) return false;
  return words.every(w => /^[A-ZÇĞİÖŞÜa-zçğışöşü\-']+$/.test(w));
}

/** TC Kimlik No (11 haneli) */
function extractTcKimlik(text: string): string | undefined {
  const m = text.match(/\b([1-9]\d{10})\b/);
  return m ? m[1] : undefined;
}

/** "FARABİ ... LİSESİ / 30" → "30" */
function extractSchoolNumber(line: string): string | undefined {
  const m = line.match(/\/\s*(\d{1,6})\s*$/);
  return m ? m[1] : undefined;
}

/** "AMP - 9. Sınıf / A Şubesi" → "9/A" */
function normalizeClassName(raw: string): string {
  const m = raw.match(/(\d{1,2})\s*[./\-]?\s*(?:[Ss]ınıf\s*)?[/\-]?\s*([A-ZÇĞİÖŞÜa-z])\s*[Şş]ube/i);
  if (m) return `${m[1]}/${m[2].toUpperCase()}`;
  const m2 = raw.match(/(\d{1,2})[.\s]+[Ss]ınıf\s*\/\s*([A-Z])/i);
  if (m2) return `${m2[1]}/${m2[2].toUpperCase()}`;
  const m3 = raw.match(/(\d{1,2})\.\s*[Ss]ınıf\s*\/\s*([A-Z])/i);
  if (m3) return `${m3[1]}/${m3[2].toUpperCase()}`;
  return raw;
}

function cleanSubjectName(name: string): string {
  return name.replace(/\s{2,}/g, ' ').replace(/[/\\]/g, ' ').trim();
}

// ── PDF metin çıkarma ─────────────────────────────────────────────────────────

async function extractAllPagesText(pdfPath: string): Promise<string[]> {
  const mupdf = await getMupdf();
  const fileData = fs.readFileSync(pdfPath);
  const doc = new mupdf.PDFDocument(fileData);
  const pageCount = doc.countPages();

  const pages: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = doc.loadPage(i);
    const text: string = page.toStructuredText('preserve-whitespace').asText();
    pages.push(text);
  }
  return pages;
}

// ── Sayfa parse ───────────────────────────────────────────────────────────────

function parseStudentPage(pageText: string): ParsedKarneStudent | null {
  const rawLines = pageText.split('\n').map(l => l.trim()).filter(Boolean);

  // ── 1. Meta bilgiler ──────────────────────────────────────────────────────
  let fullName = '';
  let className = '';
  let tcKimlikNo: string | undefined;
  let schoolNumber: string | undefined;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const lineU = line.toUpperCase();

    if (!tcKimlikNo) tcKimlikNo = extractTcKimlik(line);
    if (!schoolNumber) schoolNumber = extractSchoolNumber(line);

    // Öğrenci adı: "Adı ve Soyadı" etiketini ara
    if (!fullName && lineU.includes('ADI VE SOYADI')) {
      const labelMatch = line.match(/ad[ıi]\s*ve\s*soyad[ıi]\s*:?\s*(.+)/i);
      if (labelMatch && labelMatch[1].trim().length > 2) {
        fullName = labelMatch[1].trim();
      } else {
        for (let k = i + 1; k <= i + 3 && k < rawLines.length; k++) {
          if (isFullName(rawLines[k])) { fullName = rawLines[k]; break; }
        }
      }
    }

    // Sınıf: "AMP - 9. Sınıf / A Şubesi" formatındaki satırı yakala
    if (!className) {
      if (/\d+\.\s*[Ss]ınıf\s*\//.test(line) || /\d+\.\s*[Ss]ınıf\s+[A-Z]\s*[Şş]ube/i.test(line)) {
        className = normalizeClassName(line);
      } else if (lineU.includes('SINIFI') && !lineU.includes('SINIFININ')) {
        const classMatch = line.match(/sınıf[ıi]?\s*:?\s*(.+)/i);
        if (classMatch && classMatch[1].trim().length > 0) {
          className = normalizeClassName(classMatch[1].trim());
        } else if (i + 1 < rawLines.length) {
          className = normalizeClassName(rawLines[i + 1].trim());
        }
      }
    }
  }

  // ── 2. Öğrenci adını bul (etiket bulunamadıysa) ──────────────────────────
  if (!fullName) {
    let firstNumLine = rawLines.length;
    for (let i = 0; i < rawLines.length; i++) {
      if (NUMBER_RE.test(rawLines[i].trim())) { firstNumLine = i; break; }
    }
    for (let i = 0; i < firstNumLine; i++) {
      if (isFullName(rawLines[i])) { fullName = rawLines[i]; break; }
    }
    if (!fullName) {
      for (const line of rawLines) {
        if (isFullName(line)) { fullName = line; break; }
      }
    }
  }

  // ── 3. Ders notlarını çıkar ───────────────────────────────────────────────
  const grades = extractGrades(rawLines);

  if (!fullName && grades.length === 0) return null;

  const failedSubjects = grades.filter(g => g.grade < 50);
  return {
    fullName: fullName || 'Bilinmiyor',
    className,
    tcKimlikNo,
    schoolNumber,
    grades,
    failedSubjects,
  };
}

/**
 * MEB e-Okul karne format: mupdf sayfayı sütun bazlı bloklar halinde okur.
 *
 * Ham metinde sıra:
 *   [Ders adları - her biri ayrı satır]
 *   [Haftalık saatler - küçük tam sayılar]
 *   ...meta bilgiler (öğrenci adı, okul bilgileri)...
 *   [I. Dönem Puanları - ders sayısı kadar]
 *   [II. Dönem Puanları]
 *   [Ağırlıklı Puanlar - >100 büyük değerler]
 *   [Yıl Sonu Puanları - 0-100 arası, ders sayısı kadar]  ← bunu istiyoruz
 *
 * Algoritma:
 * 1. Ders adlarını topla
 * 2. Tüm sayıları sırayla topla
 * 3. Ağırlıklı Puan bloğunu bul (>100 olan değerlerin yoğunlaştığı N'lik pencere)
 * 4. Ağırlıklı bloktan sonraki N sayı = Yıl Sonu Puanları
 * 5. Ders adları ile eşleştir
 */
function extractGrades(lines: string[]): ParsedGrade[] {
  // Adım 1: Ders adlarını topla (sayfanın başında, sayılardan önce)
  const subjects: string[] = [];
  for (const line of lines) {
    if (isSubjectName(line) && !isFullName(line)) {
      const name = cleanSubjectName(line);
      if (!subjects.includes(name)) {
        subjects.push(name);
      }
    }
  }

  if (subjects.length === 0) return [];
  const N = subjects.length;

  // Adım 2: Tüm sayıları sırayla topla (0-1000 arası)
  const allNumbers: number[] = [];
  for (const line of lines) {
    const cleaned = line.replace(',', '.');
    if (NUMBER_RE.test(line.trim())) {
      const n = parseFloat(cleaned);
      if (!isNaN(n) && n >= 0 && n <= 1000) {
        allNumbers.push(n);
      }
    }
  }

  if (allNumbers.length < N * 2) return [];

  // Adım 3: Ağırlıklı Puan bloğunu bul
  // Özellik: N ardışık sayı, yarısından fazlası >100
  let agirlikliStart = -1;
  for (let i = 0; i <= allNumbers.length - N; i++) {
    const window = allNumbers.slice(i, i + N);
    const over100 = window.filter(x => x > 100).length;
    if (over100 >= Math.ceil(N * 0.5)) {
      agirlikliStart = i;
      break;
    }
  }

  if (agirlikliStart === -1) {
    return fallbackGrades(subjects, allNumbers);
  }

  // Adım 4: Ağırlıklı bloktan sonra N sayı = Yıl Sonu Puanları
  const yilSonuStart = agirlikliStart + N;
  if (yilSonuStart + N > allNumbers.length) {
    return fallbackGrades(subjects, allNumbers);
  }

  const yilSonuPuanlari = allNumbers.slice(yilSonuStart, yilSonuStart + N);

  // Adım 5: Eşleştir — Yıl Sonu 0-100 arası olmalı
  const grades: ParsedGrade[] = [];
  for (let i = 0; i < N; i++) {
    const grade = yilSonuPuanlari[i];
    if (grade >= 0 && grade <= 100) {
      grades.push({ subject: subjects[i], grade: Math.round(grade * 10000) / 10000 });
    }
  }

  // Eğer bazı notlar 0-100 dışındaysa bu blok yanlış — fallback
  if (grades.length < N * 0.8) {
    return fallbackGrades(subjects, allNumbers);
  }

  return grades;
}

/** Yedek: Ağırlıklı blok bulunamadıysa, son N adet 0-100 arası sayıyı kullan */
function fallbackGrades(subjects: string[], allNumbers: number[]): ParsedGrade[] {
  const N = subjects.length;
  const validNums = allNumbers.filter(x => x >= 0 && x <= 100);
  if (validNums.length < N) return [];

  // Son N tanesini al (Yıl Sonu en sonda gelir)
  const yilSonu = validNums.slice(validNums.length - N);
  return subjects.map((subject, i) => ({
    subject,
    grade: Math.round(yilSonu[i] * 10000) / 10000,
  }));
}

// ── Ana export ────────────────────────────────────────────────────────────────

export async function parseKarnePdf(pdfPath: string): Promise<{
  students: ParsedKarneStudent[];
  rawText: string;
}> {
  const pages = await extractAllPagesText(pdfPath);
  const rawText = pages.join('\n\n--- SAYFA SONU ---\n\n');
  const students: ParsedKarneStudent[] = [];

  for (const pageText of pages) {
    const student = parseStudentPage(pageText);
    if (student && student.grades.length > 0) {
      students.push(student);
    }
  }

  // Tekilleştir: aynı isimli öğrenci birden fazla sayfada çıkarsa birleştir
  const unique = new Map<string, ParsedKarneStudent>();
  for (const s of students) {
    const key = s.fullName.toUpperCase().trim();
    if (unique.has(key)) {
      const existing = unique.get(key)!;
      for (const g of s.grades) {
        if (!existing.grades.find(eg => eg.subject === g.subject)) {
          existing.grades.push(g);
        }
      }
      existing.failedSubjects = existing.grades.filter(g => g.grade < 50);
    } else {
      unique.set(key, s);
    }
  }

  // 4+ başarısız dersi olan öğrencileri döndür
  const filtered = Array.from(unique.values()).filter(s => s.failedSubjects.length > 3);

  return { students: filtered, rawText };
}
