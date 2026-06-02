import sharp from 'sharp';
import path from 'path';
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

/**
 * PDF veya görsel dosyasından alt %50'yi kırparak JPEG önizleme üretir.
 * @returns Üretilen önizleme JPG'nin tam yolu, ya da hata halinde null
 */
export async function generateAbsenteeismPreview(filePath: string): Promise<string | null> {
  const ext = path.extname(filePath).toLowerCase();
  const previewPath = filePath.slice(0, filePath.length - path.extname(filePath).length) + '_preview.jpg';

  try {
    let pngBuffer: Buffer;

    if (ext === '.pdf') {
      pngBuffer = await pdfFirstPageToBuffer(filePath);
    } else {
      // Zaten görsel (JPG/PNG) — direkt oku
      pngBuffer = fs.readFileSync(filePath);
    }

    const meta = await sharp(pngBuffer).metadata();
    const width = meta.width;
    const height = meta.height;

    if (!width || !height) {
      throw new Error('Görsel boyutları okunamadı.');
    }

    // Üst %50'yi kırp
    const cropHeight = Math.floor(height * 0.5);

    await sharp(pngBuffer)
      .extract({ left: 0, top: 0, width, height: cropHeight })
      .jpeg({ quality: 100 })
      .toFile(previewPath);

    try { console.log(`✅ Önizleme oluşturuldu: ${previewPath}`); } catch {}
    return previewPath;
  } catch (err: any) {
    try { console.error(`⚠️ Önizleme üretimi başarısız (${filePath}): ${err?.message}`); } catch {}
    return null;
  }
}

/**
 * PDF veya görsel dosyasının ilk sayfasını kırpmasız PNG buffer olarak döndürür.
 * WhatsApp gönderiminde kullanıcı tarafından seçilecek crop alanı için kullanılır.
 */
export async function getFullPageBuffer(filePath: string): Promise<Buffer> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    return await pdfFirstPageToBuffer(filePath);
  } else {
    return fs.readFileSync(filePath);
  }
}

/**
 * PDF'nin ilk sayfasını 2x ölçekle PNG buffer'a render eder.
 */
async function pdfFirstPageToBuffer(pdfPath: string): Promise<Buffer> {
  const mupdf = await getMupdf();

  const fileData = fs.readFileSync(pdfPath);
  const doc = new mupdf.PDFDocument(fileData);
  const page = doc.loadPage(0); // 0-indexed, ilk sayfa

  // 2x ölçek → A4 için ~1654x2339 px (yeterli kalite)
  const matrix = mupdf.Matrix.scale(2, 2);
  const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false);

  const pngData: Uint8Array = pixmap.asPNG();
  return Buffer.from(pngData);
}

/**
 * Mevcut önizleme dosyasını diskten siler (kayıt silinirken çağrılır).
 */
export function deletePreviewFile(previewPath: string | null | undefined): void {
  if (!previewPath) return;
  try {
    const fullPath = path.resolve(previewPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // Dosya zaten yoksa sessizce geç
  }
}

export interface AbsenceDays {
  excusedDays: number | null;
  unexcusedDays: number | null;
}

/**
 * PDF'den özürlü ve özürsüz devamsızlık günlerini çıkarır.
 * mupdf asText() ile düz metin alır, regex ile sayıları arar.
 * Sayısal değer bulunamazsa null döner.
 */
export async function extractAbsenceDays(filePath: string): Promise<AbsenceDays> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.pdf') {
    return { excusedDays: null, unexcusedDays: null };
  }

  try {
    const mupdf = await getMupdf();
    const fileData = fs.readFileSync(filePath);
    const doc = new mupdf.PDFDocument(fileData);

    // Tüm sayfalardaki metni birleştir (genellikle 1 sayfa)
    let fullText = '';
    const pageCount = doc.countPages ? doc.countPages() : 1;
    for (let i = 0; i < Math.min(pageCount, 3); i++) {
      const page = doc.loadPage(i);
      const sText = page.toStructuredText('preserve-whitespace');
      fullText += sText.asText() + '\n';
    }

    return parseAbsenceDays(fullText);
  } catch (err: any) {
    try { console.error(`⚠️ PDF metin çıkarma başarısız: ${err?.message}`); } catch {}
    return { excusedDays: null, unexcusedDays: null };
  }
}

/**
 * Metinden özürlü/özürsüz gün sayılarını regex ile çıkarır.
 * Desteklenen formatlar:
 *   "3 gün özürlü", "özürlü: 3", "Özürlü Devamsızlık: 3",
 *   "12,5 gün özürsüz", "özürsüz 12.5 gün" vs.
 */
function parseAbsenceDays(text: string): AbsenceDays {
  // Virgülü noktaya çevir (Türkçe ondalık ayracı)
  const normalized = text.replace(/(\d),(\d)/g, '$1.$2');

  const numPat = '(\\d+(?:\\.\\d+)?)';

  // Özürlü: sayı önce veya sonra
  const excusedPatterns = [
    new RegExp(`${numPat}\\s*gün[\\s]*özürl[üu]`, 'i'),
    new RegExp(`özürl[üu][\\s\\S]{0,20}?${numPat}\\s*gün`, 'i'),
    new RegExp(`özürl[üu]\\s*(?:devams[ıi]zl[ıi][kğg][ıi]?\\s*)?:?\\s*${numPat}`, 'i'),
  ];

  // Özürsüz: sayı önce veya sonra
  const unexcusedPatterns = [
    new RegExp(`${numPat}\\s*gün[\\s]*özürsüz`, 'i'),
    new RegExp(`özürsüz[\\s\\S]{0,20}?${numPat}\\s*gün`, 'i'),
    new RegExp(`özürsüz\\s*(?:devams[ıi]zl[ıi][kğg][ıi]?\\s*)?:?\\s*${numPat}`, 'i'),
  ];

  let excusedDays: number | null = null;
  for (const pat of excusedPatterns) {
    const m = normalized.match(pat);
    if (m) {
      const val = parseFloat(m[1] ?? m[2] ?? '');
      if (!isNaN(val)) { excusedDays = val; break; }
    }
  }

  let unexcusedDays: number | null = null;
  for (const pat of unexcusedPatterns) {
    const m = normalized.match(pat);
    if (m) {
      const val = parseFloat(m[1] ?? m[2] ?? '');
      if (!isNaN(val)) { unexcusedDays = val; break; }
    }
  }

  if (excusedDays !== null || unexcusedDays !== null) {
    console.log(`📋 Devamsızlık verileri çıkarıldı — özürlü: ${excusedDays}, özürsüz: ${unexcusedDays}`);
  } else {
    console.log('⚠️ PDF metninde özürlü/özürsüz gün verisi bulunamadı.');
  }

  return { excusedDays, unexcusedDays };
}

