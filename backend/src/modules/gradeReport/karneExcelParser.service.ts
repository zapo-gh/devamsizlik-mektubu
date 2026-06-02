import fs from 'fs';
import * as XLSX from 'xlsx';
import { ParsedGrade, ParsedKarneStudent } from './karneParser.service';

/**
 * e-Okul not listesi Excel formatı:
 *   Satır 1: Üst başlıklar (Öğrenci No, Sınıf Seviyesi, 1. Dönem Ortalaması, 2. Dönem, Yıl Sonu Ortalaması)
 *   Satır 2: Boş (birleştirilmiş hücre devamı)
 *   Satır 3: Alt başlıklar (Öğrenci Adı, Öğrenci Soyadı, Şubesi, Ders Adı ...)
 *   Satır 4+: Veri - her satır 1 öğrenci + 1 ders
 *
 * Sütunlar (0-indexed):
 *   A(0): Öğrenci No (okul numarası)
 *   B(1): Öğrenci Adı
 *   C(2): Öğrenci Soyadı
 *   D(3): (TC Kimlik veya boş)
 *   E(4): Sınıf seviyesi (9, 10, 11)
 *   F(5): Şube (A, B, C)
 *   G(6): Alt şube/bölüm (genellikle "Sub" veya benzer)
 *   H-J  : Sınıf+Şube+DersAdı birleşik metin
 *   Son 3 sütun: 1. Dönem | 2. Dönem | Yıl Sonu Ortalaması
 */

interface ExcelRow {
  ogrenciNo: string;
  ad: string;
  soyad: string;
  tcKimlik?: string;
  sinif: string;
  sube: string;
  dersAdi: string;
  donem1: number | null;
  donem2: number | null;
  yilSonu: number | null;
}

function cellStr(ws: XLSX.WorkSheet, col: number, row: number): string {
  const addr = XLSX.utils.encode_cell({ c: col, r: row });
  const cell = ws[addr];
  if (!cell) return '';
  return String(cell.v ?? '').trim();
}

function cellNum(ws: XLSX.WorkSheet, col: number, row: number): number | null {
  const addr = XLSX.utils.encode_cell({ c: col, r: row });
  const cell = ws[addr];
  if (!cell) return null;
  const v = parseFloat(String(cell.v ?? '').replace(',', '.'));
  return isNaN(v) ? null : v;
}

/**
 * Header satırını bul — "Yıl Sonu" veya "Öğrenci Adı" içeren satır.
 * Tipik olarak satır 2 (0-indexed) veya satır 3.
 */
function findHeaderRow(ws: XLSX.WorkSheet, range: XLSX.Range): number {
  for (let r = range.s.r; r <= Math.min(range.s.r + 6, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const val = cellStr(ws, c, r).toLocaleUpperCase('tr-TR');
      if (val.includes('ÖĞRENCİ ADI') || val.includes('OGRENCI ADI')) return r;
    }
  }
  // Bulunamazsa varsayılan: satır 2 (0-indexed)
  return 2;
}

/**
 * Sütun başlıklarını tarayarak kolon indexlerini bul.
 * Hem satır 0 (üst başlık) hem headerRow (alt başlık) taranır.
 */
function findColumns(ws: XLSX.WorkSheet, range: XLSX.Range): {
  ogrenciNo: number;
  ad: number;
  soyad: number;
  tcKimlik: number;
  sinif: number;
  sube: number;
  dersAdi: number;
  donem1: number;
  donem2: number;
  yilSonu: number;
} {
  const headerRow = findHeaderRow(ws, range);
  const cols: Record<string, number> = {};

  // Hem üst başlık satırı hem alt başlık satırı tara
  for (const row of [0, headerRow]) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const val = cellStr(ws, c, row).toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim();
      if (!val) continue;
      if ((val.includes('ÖĞRENCİ NO') || val.includes('OGRENCI NO')) && !cols.ogrenciNo) cols.ogrenciNo = c;
      if ((val.includes('ÖĞRENCİ ADI') || val.includes('OGRENCI ADI')) && !cols.ad) cols.ad = c;
      if ((val.includes('SOYADI') || val.includes('SOYADΙ')) && !cols.soyad) cols.soyad = c;
      if (val.includes('TC') && !cols.tcKimlik) cols.tcKimlik = c;
      if ((val.includes('SINIF SEVİYESİ') || val.includes('SINIF DÜZEYİ') || val === 'SINIF') && !cols.sinif) cols.sinif = c;
      if ((val.includes('ŞUBESİ') || val === 'ŞUBE' || val.includes('ŞUBE')) && !cols.sube) cols.sube = c;
      if ((val.includes('DERS ADI') || val.includes('DERSİN ADI')) && !cols.dersAdi) cols.dersAdi = c;
      if ((val.includes('1. DÖNEM') || val.includes('1.DÖNEM') || val.includes('BİRİNCİ DÖNEM')) && !cols.donem1) cols.donem1 = c;
      if ((val.includes('2. DÖNEM') || val.includes('2.DÖNEM') || val.includes('İKİNCİ DÖNEM') || val.includes('2. DÖNE')) && !cols.donem2) cols.donem2 = c;
      if ((val.includes('YIL SONU') || val.includes('YILSONU') || val.includes('YIL SONU ORT')) && !cols.yilSonu) cols.yilSonu = c;
    }
  }

  // Fallback: eğer Ders Adı bulunamadıysa ve birleşik sınıf+ders sütunu varsa
  // "9. Sınıf / A Sub DERS ADI" formatındaki sütunu bul
  if (!cols.dersAdi) {
    const dataRow = headerRow + 1;
    for (let c = range.s.c; c <= range.e.c; c++) {
      const val = cellStr(ws, c, dataRow);
      if (/\d+\.\s*S[ıi]n[ıi]f/.test(val) && val.length > 15) {
        cols.dersAdiBilesik = c;
        break;
      }
    }
  }

  // Yıl Sonu bulunamadıysa: sondaki 3 sayı sütunundan sonuncusu
  if (!cols.yilSonu) {
    const dataRow = headerRow + 1;
    const numCols: number[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const n = cellNum(ws, c, dataRow);
      if (n !== null && n >= 0 && n <= 100) numCols.push(c);
    }
    if (numCols.length >= 1) cols.yilSonu = numCols[numCols.length - 1];
    if (numCols.length >= 2 && !cols.donem2) cols.donem2 = numCols[numCols.length - 2];
    if (numCols.length >= 3 && !cols.donem1) cols.donem1 = numCols[numCols.length - 3];
  }

  return {
    ogrenciNo: cols.ogrenciNo ?? 0,
    ad:        cols.ad ?? 1,
    soyad:     cols.soyad ?? 2,
    tcKimlik:  cols.tcKimlik ?? -1,
    sinif:     cols.sinif ?? 4,
    sube:      cols.sube ?? 5,
    dersAdi:   cols.dersAdi ?? (cols.dersAdiBilesik ?? 6),
    donem1:    cols.donem1 ?? -1,
    donem2:    cols.donem2 ?? -1,
    yilSonu:   cols.yilSonu ?? -1,
  };
}

/**
 * "9. Sınıf / A Sub ANATOMİ VE FİZYOLOJİ" → "ANATOMİ VE FİZYOLOJİ"
 * veya direkt "ANATOMİ VE FİZYOLOJİ" → değişmez
 */
function extractDersAdi(raw: string): string {
  // "Sınıf" ve "/" içeriyorsa ders adı sondadır
  const m = raw.match(/S[ıi]nıf\s*\/\s*\w+\s+\w+\s+(.+)/i);
  if (m) return m[1].trim().toUpperCase();
  const m2 = raw.match(/Sub\s+(.+)/i);
  if (m2) return m2[1].trim().toUpperCase();
  return raw.trim().toUpperCase();
}

/**
 * Excel dosyasını parse eder.
 * Her satır = 1 öğrenci + 1 ders. Öğrenci bazında gruplar,
 * Yıl Sonu < 50 olan dersleri failedSubjects olarak işaretler.
 */
export function parseKarneExcel(filePath: string): ParsedKarneStudent[] {
  const fileData = fs.readFileSync(filePath);
  const wb = XLSX.read(fileData, { type: 'buffer' });

  // İlk sayfayı kullan
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Excel dosyasında sayfa bulunamadı.');

  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:Z1000');
  const headerRow = findHeaderRow(ws, range);
  const C = findColumns(ws, range);

  // Veri satırlarını oku
  const rows: ExcelRow[] = [];
  for (let r = headerRow + 1; r <= range.e.r; r++) {
    const ogrenciNo = cellStr(ws, C.ogrenciNo, r);
    const ad        = cellStr(ws, C.ad, r);
    const soyad     = cellStr(ws, C.soyad, r);

    // Boş satır atla
    if (!ogrenciNo && !ad) continue;

    const dersRaw  = cellStr(ws, C.dersAdi, r);
    const dersAdi  = extractDersAdi(dersRaw);
    if (!dersAdi) continue;
    // Özet/ortalama satırlarını atla
    if (/DÖNEM|ORTALAMA|TOPLAM|GENEL|YIL SONU|YILSONU|SINIF ORT|NOT DÖKÜM/i.test(dersAdi)) continue;
    // Çok kısa (1-3 karakter) veya sayı içeren sahte ders adlarını atla
    if (dersAdi.length < 4 && /^[IVX\d]/.test(dersAdi)) continue;

    const sinifRaw = cellStr(ws, C.sinif, r);
    const subeRaw  = cellStr(ws, C.sube, r);

    // Fallback: sınıf/şube ayrı sütunda yoksa ders hücresinden çıkar
    // Örnek: "9. Sınıf / A Sub ANATOMİ VE FİZYOLOJİ"
    let sinif = sinifRaw;
    let sube  = subeRaw;
    if (!sinif || !sube) {
      const m = dersRaw.match(/(\d+)\.?\s*S[\u0131i]n[\u0131i]f\s*\/\s*(\w+)/i);
      if (m) {
        if (!sinif) sinif = m[1];
        if (!sube)  sube  = m[2];
      }
    }
    const tcKimlik = C.tcKimlik >= 0 ? cellStr(ws, C.tcKimlik, r) : undefined;
    const yilSonu  = C.yilSonu >= 0 ? cellNum(ws, C.yilSonu, r) : null;
    const donem1   = C.donem1 >= 0 ? cellNum(ws, C.donem1, r) : null;
    const donem2   = C.donem2 >= 0 ? cellNum(ws, C.donem2, r) : null;

    rows.push({ ogrenciNo, ad, soyad, tcKimlik, sinif, sube, dersAdi, donem1, donem2, yilSonu });
  }

  // Öğrenci bazında grupla (okul no + ad + soyad)
  const studentMap = new Map<string, ParsedKarneStudent>();

  for (const row of rows) {
    const key = `${row.ogrenciNo}|${row.ad.toUpperCase()}|${row.soyad.toUpperCase()}`;
    if (!studentMap.has(key)) {
      const fullName = `${row.ad} ${row.soyad}`.trim().toUpperCase();
      studentMap.set(key, {
        fullName,
        className: '',
        tcKimlikNo: row.tcKimlik || undefined,
        schoolNumber: row.ogrenciNo || undefined,
        grades: [],
        failedSubjects: [],
      });
    }

    const student = studentMap.get(key)!;

    // Birleştirilmiş hücreler nedeniyle ilk satırda boş gelebilir;
    // değer bulunca güncelle
    if (!student.className && (row.sinif || row.sube)) {
      // "9. Sınıf / A Şubesi" gibi tam sınıf bilgisini içeren hücreden parse et
      const combined = row.sube || row.sinif || '';
      const fullMatch = combined.match(/(\d+)\.?\s*S[ıi]n[ıi]f\s*[\/]\s*([A-Za-z\u00C0-\u024F]+)/i);
      if (fullMatch) {
        student.className = `${fullMatch[1]}/${fullMatch[2].toLocaleUpperCase('tr-TR')}`;
      } else {
        // Fallback: sinif sütununda rakam, sube sütununda harf
        const sinifNorm = (row.sinif || '').match(/\d+/)?.[0] || row.sinif || '';
        const subeNorm  = (row.sube  || '').match(/^[A-Za-z\u00C0-\u024F]+/)?.[0]?.toLocaleUpperCase('tr-TR') || '';
        student.className = sinifNorm && subeNorm
          ? `${sinifNorm}/${subeNorm}`
          : sinifNorm || subeNorm || '';
      }
    }
    if (row.yilSonu !== null && !student.grades.find(g => g.subject === row.dersAdi)) {
      const grade: ParsedGrade = { subject: row.dersAdi, grade: row.yilSonu };
      student.grades.push(grade);
    }
  }

  // failedSubjects hesapla
  for (const student of studentMap.values()) {
    student.failedSubjects = student.grades.filter(g => g.grade < 50);
  }

  return Array.from(studentMap.values());
}
