'use strict';
/**
 * Uygulama ikonu oluşturma scripti.
 * Çalıştırma: node create-icon.js
 * Çıktı: assets/icon.png (256x256) ve assets/icon.ico
 */
const path = require('path');
const fs   = require('fs');

// sharp'ı backend node_modules'den kullan
const sharp = require(path.join(__dirname, 'backend', 'node_modules', 'sharp'));

// ── Ikon SVG tasarımı ────────────────────────────────────────────────────────
// Koyu lacivert zemin üzerinde belge + kırmızı "gıyabi" rozeti
const svgContent = `<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e3a5f"/>
      <stop offset="100%" stop-color="#0f2340"/>
    </linearGradient>
    <linearGradient id="doc" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e8f0fe"/>
    </linearGradient>
  </defs>

  <!-- Arkaplan -->
  <rect width="256" height="256" rx="48" fill="url(#bg)"/>

  <!-- Belge gövdesi -->
  <rect x="52" y="36" width="134" height="168" rx="10" fill="url(#doc)" />

  <!-- Belge katlama köşesi -->
  <polygon points="152,36 186,70 152,70" fill="#c7d7f5"/>
  <polygon points="152,36 186,70 152,70" fill="none" stroke="#a8bfee" stroke-width="1.5"/>

  <!-- Başlık çizgisi -->
  <rect x="70" y="56" width="64" height="7" rx="3.5" fill="#1e3a5f" opacity="0.25"/>

  <!-- İçerik çizgileri -->
  <rect x="70" y="80"  width="98" height="5" rx="2.5" fill="#1e3a5f" opacity="0.15"/>
  <rect x="70" y="93"  width="90" height="5" rx="2.5" fill="#1e3a5f" opacity="0.15"/>
  <rect x="70" y="106" width="98" height="5" rx="2.5" fill="#1e3a5f" opacity="0.15"/>
  <rect x="70" y="119" width="75" height="5" rx="2.5" fill="#1e3a5f" opacity="0.15"/>

  <!-- İmza çizgisi -->
  <rect x="70" y="155" width="60" height="4" rx="2" fill="#1e3a5f" opacity="0.2"/>
  <rect x="70" y="168" width="40" height="3" rx="1.5" fill="#1e3a5f" opacity="0.12"/>

  <!-- Mühür / rozet (sağ alt) -->
  <circle cx="185" cy="195" r="42" fill="#c0392b"/>
  <circle cx="185" cy="195" r="36" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2.5"/>

  <!-- Rozet içi "X" işareti -->
  <line x1="169" y1="179" x2="201" y2="211" stroke="white" stroke-width="8" stroke-linecap="round"/>
  <line x1="201" y1="179" x2="169" y2="211" stroke="white" stroke-width="8" stroke-linecap="round"/>
</svg>`;

// ── Çok çözünürlüklü ICO oluştur ─────────────────────────────────────────────
// Windows / rcedit uyumluluğu için:
//   16, 32, 48 px → BMP DIB (raw BGRA + AND mask)
//   256 px       → PNG compressed (Vista+)
async function buildMultiResIco(svgBuf) {
  const sizes = [16, 32, 48, 256];

  // BMP DIB bloğu oluştur (ICO içine gömülü, dosya başlığı olmadan)
  function buildBmpDib(rgbaData, size) {
    const bmpHeader = Buffer.alloc(40);
    bmpHeader.writeUInt32LE(40, 0);          // biSize
    bmpHeader.writeInt32LE(size, 4);         // biWidth
    bmpHeader.writeInt32LE(size * 2, 8);     // biHeight (XOR + AND için x2)
    bmpHeader.writeUInt16LE(1, 12);          // biPlanes
    bmpHeader.writeUInt16LE(32, 14);         // biBitCount
    bmpHeader.writeUInt32LE(0, 16);          // biCompression BI_RGB
    bmpHeader.writeUInt32LE(0, 20);          // biSizeImage
    bmpHeader.writeInt32LE(0, 24);           // biXPelsPerMeter
    bmpHeader.writeInt32LE(0, 28);           // biYPelsPerMeter
    bmpHeader.writeUInt32LE(0, 32);          // biClrUsed
    bmpHeader.writeUInt32LE(0, 36);          // biClrImportant

    // RGBA → BGRA, alt-üst çevir (BMP bottom-up)
    const pixels = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const src = ((size - 1 - y) * size + x) * 4;
        const dst = (y * size + x) * 4;
        pixels[dst]     = rgbaData[src + 2]; // B
        pixels[dst + 1] = rgbaData[src + 1]; // G
        pixels[dst + 2] = rgbaData[src];     // R
        pixels[dst + 3] = rgbaData[src + 3]; // A
      }
    }

    // AND maskesi (her satır DWORD hizalı, tümü 0 = alfa kanalı geçerli)
    const maskRowBytes = Math.ceil(size / 8) * 4;
    const andMask = Buffer.alloc(maskRowBytes * size, 0);

    return Buffer.concat([bmpHeader, pixels, andMask]);
  }

  // Her boyut için görüntü verisi hazırla
  const images = await Promise.all(
    sizes.map(async s => {
      if (s === 256) {
        const data = await sharp(svgBuf).resize(s, s).png().toBuffer();
        return { s, data };
      } else {
        const raw = await sharp(svgBuf).resize(s, s).raw().ensureAlpha().toBuffer();
        const data = buildBmpDib(raw, s);
        return { s, data };
      }
    })
  );

  // ICO başlığı (6 byte)
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  // Dizin girişleri (her biri 16 byte)
  const entries = [];
  let offset = 6 + 16 * sizes.length;
  for (const img of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(img.s === 256 ? 0 : img.s, 0);
    e.writeUInt8(img.s === 256 ? 0 : img.s, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += img.data.length;
    entries.push(e);
  }

  return Buffer.concat([header, ...entries, ...images.map(i => i.data)]);
}

async function createIcons() {
  const assetsDir = path.join(__dirname, 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const svgBuf = Buffer.from(svgContent, 'utf8');

  console.log('🎨 SVG\'den PNG oluşturuluyor...');
  const pngBuffer = await sharp(svgBuf).resize(256, 256).png().toBuffer();

  const pngPath = path.join(assetsDir, 'icon.png');
  fs.writeFileSync(pngPath, pngBuffer);
  console.log(`✅ ${pngPath} oluşturuldu`);

  console.log('🎨 Çok çözünürlüklü ICO oluşturuluyor (16/32/48/256 px)...');
  const icoBuffer = await buildMultiResIco(svgBuf);
  const icoPath = path.join(assetsDir, 'icon.ico');
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`✅ ${icoPath} oluşturuldu`);

  console.log('\n🎉 İkonlar hazır! Şimdi "npm run build:all" çalıştırabilirsiniz.');
}

createIcons().catch(err => {
  console.error('❌ İkon oluşturma hatası:', err.message);
  process.exit(1);
});
