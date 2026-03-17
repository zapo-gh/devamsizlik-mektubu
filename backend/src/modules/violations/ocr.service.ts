import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Fotoğraftan OCR ile metin çıkarma servisi.
 * El yazısı dahil, kıyafet/makyaj kontrolü veya tören geç kalma
 * listesi fotoğraflarından öğrenci isim/numarası çıkarır.
 *
 * Birden fazla preprocessing denemesi yapılır:
 * 1. Yüksek kontrastlı binarizasyon (el yazısı için en iyi)
 * 2. Adaptive threshold benzeri işlem
 * 3. Standart normalize
 * En çok satır üreten sonuç kullanılır.
 */

/**
 * El yazısı için agresif preprocessing pipeline.
 * Yüksek kontrast, binarizasyon, gürültü temizleme, büyütme.
 */
async function preprocessVariant(
  imagePath: string,
  suffix: string,
  pipeline: (img: sharp.Sharp) => sharp.Sharp
): Promise<string> {
  const ext = path.extname(imagePath);
  const outputPath = imagePath.replace(ext, `_${suffix}${ext === '.png' ? '.png' : '.png'}`);

  const img = sharp(imagePath);
  await pipeline(img).toFile(outputPath);

  return outputPath;
}

/**
 * Çoklu preprocessing: birden fazla strateji dener, en iyisini döndürür.
 */
async function preprocessAllVariants(imagePath: string): Promise<string[]> {
  const variants: string[] = [];

  try {
    // Varyant 1: Yüksek kontrastlı binarizasyon (el yazısı için en iyi)
    const v1 = await preprocessVariant(imagePath, 'v1_binary', (img) =>
      img
        .grayscale()
        .resize({ width: 3200, withoutEnlargement: false })
        .linear(1.8, -80)  // Kontrast artır
        .sharpen({ sigma: 2.0 })
        .threshold(140)    // Siyah-beyaz binarizasyon
    );
    variants.push(v1);
  } catch {}

  try {
    // Varyant 2: Geniş threshold aralığı (soluk yazılar için)
    const v2 = await preprocessVariant(imagePath, 'v2_softbin', (img) =>
      img
        .grayscale()
        .resize({ width: 3200, withoutEnlargement: false })
        .linear(2.2, -100)  // Daha agresif kontrast
        .sharpen({ sigma: 1.5 })
        .threshold(120)      // Daha düşük threshold
    );
    variants.push(v2);
  } catch {}

  try {
    // Varyant 3: Normalize + sharpen (baskı/yazıcı çıktıları için)
    const v3 = await preprocessVariant(imagePath, 'v3_norm', (img) =>
      img
        .grayscale()
        .normalize()
        .resize({ width: 3000, withoutEnlargement: false })
        .sharpen({ sigma: 1.5 })
    );
    variants.push(v3);
  } catch {}

  return variants;
}

/**
 * Preprocessing dosyalarını temizle.
 */
function cleanupFiles(files: string[], keepOriginal: string) {
  for (const f of files) {
    if (f !== keepOriginal && fs.existsSync(f)) {
      try { fs.unlinkSync(f); } catch {}
    }
  }
}

/**
 * Fotoğraftan OCR ile metin çıkarır (Türkçe destekli).
 * Birden fazla preprocessing varyantı dener, en iyi sonucu seçer.
 */
export async function extractTextFromImage(imagePath: string): Promise<string> {
  const fullPath = path.resolve(imagePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`Dosya bulunamadı: ${fullPath}`);
  }

  // Birden fazla preprocessing varyantı üret
  let variants: string[];
  try {
    variants = await preprocessAllVariants(fullPath);
  } catch {
    variants = [];
  }

  // Orijinali de dene
  const allPaths = [...variants, fullPath];

  // Tesseract ayarları: el yazısı + tablo formatı için optimize
  const tesseractOpts: any = {
    logger: () => {},
    // PSM 6 = Assume a single uniform block of text
    // El yazısı tablolar için en uygun mod
  };

  let bestText = '';
  let bestScore = 0;

  for (const imgPath of allPaths) {
    try {
      const result = await Tesseract.recognize(imgPath, 'tur', {
        ...tesseractOpts,
      });

      const text = result.data.text || '';
      // Puanlama: sayı içeren satır sayısı (okul numarası olma olasılığı)
      const lines = text.split('\n').filter((l) => l.trim().length > 2);
      const numberLines = lines.filter((l) => /\d{2,4}/.test(l));
      const score = numberLines.length * 10 + lines.length;

      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }
    } catch {
      continue;
    }
  }

  // Preprocessing dosyalarını temizle
  cleanupFiles(variants, fullPath);

  if (!bestText || bestText.trim().length < 3) {
    throw new Error('Hiçbir preprocessing varyantı ile metin okunamadı.');
  }

  return bestText;
}

/**
 * OCR metninden satırları ayıklar ve temizler.
 * El yazısı tablo formatını da destekler.
 * Her satır potansiyel bir öğrenci ismi veya numarası olabilir.
 */
export function parseOcrLines(rawText: string): string[] {
  const rawLines = rawText.split('\n').map((line) => line.trim());

  // Başlık/meta satırlarını filtrele
  const headerPatterns = [
    /tutanak|kontrol|tören|liste|tarih|sayfa|imza|müdür|başkan|nöbet/i,
    /sıra\s*no|okul\s*no|adı?\s*soyad|sınıf|açıklama/i,
    /^\d{1,2}[\.\/-]\d{1,2}[\.\/-]\d{2,4}$/,  // Sadece tarih
    /^[\s\-_=.]+$/,  // Sadece ayraç karakterleri
    /kılık\s*kıyafet/i,
    /^T\.?C\.?\s/i, // T.C. başlığı
  ];

  const filtered: string[] = [];

  for (const line of rawLines) {
    if (line.length < 2) continue;

    // Başlık/meta mı kontrol et
    const isHeader = headerPatterns.some((p) => p.test(line));
    if (isHeader) continue;

    // Satırdan tablo bilgisi çıkar
    // Formatlar: "1 10/A 182 Sıla Karoğlu notlar..." 
    //            "10/A 182 Sıla Karoğlu"
    //            "182 Sıla Karoğlu"
    //            "182"

    // Sıra numarasını temizle (satır başındaki 1., 2-, 3) vb.)
    let cleaned = line.replace(/^\d{1,2}[\.\-\)\s]+/, '').trim();

    // Sınıf bilgisini kaldır (10/A, 9/E, 11-C vb.) — okul numarasını koruyarak
    // Sınıf formatı: sayı/harf veya sayı-harf
    cleaned = cleaned.replace(/\b\d{1,2}\s*[\/\-]\s*[A-Za-zÇçĞğİıÖöŞşÜü]\b/g, '').trim();

    // Pipe veya çoklu boşlukla ayrılmış hücreleri birleştir
    cleaned = cleaned.replace(/\s*\|\s*/g, ' ').replace(/\s{3,}/g, ' ').trim();

    if (cleaned.length < 2) continue;

    // İçinde numara veya en az 2 harf varsa geçerli satır
    const hasNumber = /\d{2,4}/.test(cleaned);
    const hasLetters = (cleaned.match(/[\p{L}]/gu) || []).length >= 2;

    if (hasNumber || hasLetters) {
      filtered.push(cleaned);
    }
  }

  return filtered;
}

/**
 * Manuel girişten gelen metin/numaraları parse eder.
 * Desteklenen formatlar:
 * - "182, 592, 561" (sadece numaralar)
 * - "182 Sıla Karoğlu\n592 Meryem Gök" (numara + isim, satır satır)
 * - "182\n592\n561" (satır satır numaralar)
 * - "182 592 561" (boşlukla ayrılmış numaralar)
 */
export function parseManualInput(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Virgül, satır veya noktalı virgülle ayr
  const parts = text
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Eğer tek bir satır ve sadece boşluk/virgülle ayrılmış numaralar ise
  if (parts.length === 1 && /^\d[\d\s,;]+$/.test(parts[0])) {
    return parts[0]
      .split(/[\s,;]+/)
      .filter((s) => /^\d{2,4}$/.test(s));
  }

  return parts;
}
