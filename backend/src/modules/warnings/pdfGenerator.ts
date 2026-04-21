import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface WarningPdfData {
  studentFullName: string;
  studentClassName: string;
  studentSchoolNumber: string;
  warningNumber: number;
  behaviorText: string;
  behaviorArticle?: string;
  description?: string;
  guidanceNote?: string;
  classTeacherName?: string;
  schoolCounselorName?: string;
  issuedBy: string;
  issuedAt: Date;
  schoolName?: string;
  principalName?: string;
}

// Font resolution: search multiple possible locations
function resolveFonts(): { regular: string; bold: string; system: boolean } {
  const candidates = [
    // Relative to compiled dist/modules/warnings/
    path.resolve(__dirname, '..', '..', '..', 'fonts'),
    // Relative to CWD (when Render runs from backend/)
    path.resolve(process.cwd(), 'fonts'),
    // Relative to CWD (when Render runs from project root)
    path.resolve(process.cwd(), 'backend', 'fonts'),
    // Windows system fonts
    'C:/Windows/Fonts',
  ];

  for (const dir of candidates) {
    const regular = path.join(dir, 'times.ttf');
    const bold = path.join(dir, 'timesbd.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      console.log(`[PDF] Using fonts from: ${dir}`);
      return { regular, bold, system: true };
    }
  }

  console.warn('[PDF] No Turkish fonts found, falling back to Helvetica');
  return { regular: 'Helvetica', bold: 'Helvetica-Bold', system: false };
}

function fmtDate(date: Date): string {
  const d = new Date(date);
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

function hr(doc: PDFKit.PDFDocument, y: number, x1: number, x2: number, w = 0.5, c = '#000000') {
  doc.save().moveTo(x1, y).lineTo(x2, y).strokeColor(c).lineWidth(w).stroke().restore();
}

/**
 * Resmi yazili uyari PDF belgesi - MEB standartlarina uygun
 * Tek sayfa A4 formatında, yönetmelik madde referanslı
 */
export async function generateWarningPdf(
  data: WarningPdfData,
  outputPath: string
): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 45, bottom: 35, left: 60, right: 60 },
      bufferPages: true,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    const fonts = resolveFonts();
    if (fonts.system) {
      doc.registerFont('Normal', fonts.regular);
      doc.registerFont('Kalin', fonts.bold);
    } else {
      doc.registerFont('Normal', 'Helvetica');
      doc.registerFont('Kalin', 'Helvetica-Bold');
    }

    const ML = doc.page.margins.left;
    const PW = doc.page.width;
    const CW = PW - ML - doc.page.margins.right;
    const RE = PW - doc.page.margins.right;
    const school = data.schoolName || '';
    const dateStr = fmtDate(data.issuedAt);
    const behaviorArticle = data.behaviorArticle || 'Madde 164';

    // ── ANTET ──────────────────────────────────────────
    doc.font('Kalin').fontSize(11);
    doc.text('T.C.', ML, 45, { width: CW, align: 'center' });
    doc.text('MİLLÎ EĞİTİM BAKANLIĞI', ML, doc.y, { width: CW, align: 'center' });
    if (school) {
      doc.text(school.toLocaleUpperCase('tr-TR'), ML, doc.y, { width: CW, align: 'center' });
    }

    doc.moveDown(0.3);
    hr(doc, doc.y, ML, RE, 1);
    doc.moveDown(0.05);
    hr(doc, doc.y, ML, RE, 0.3);

    // ── TARİH (sağ üst) ───────────────────────────────
    doc.moveDown(0.4);
    doc.font('Normal').fontSize(10);
    doc.text(dateStr, ML, doc.y, { width: CW, align: 'right' });

    // ── BELGE BAŞLIĞI ──────────────────────────────────
    doc.moveDown(0.5);
    doc.font('Kalin').fontSize(13);
    doc.text('YAZILI UYARI BELGESİ', ML, doc.y, { width: CW, align: 'center' });
    doc.font('Normal').fontSize(9).fillColor('#555555');
    doc.text(`Uyarı No: ${data.warningNumber}`, ML, doc.y + 2, { width: CW, align: 'center' });
    doc.fillColor('#000000');

    // ── ÖĞRENCİ BİLGİLERİ TABLOSU ────────────────────
    doc.moveDown(0.6);

    const TL = ML;
    const TW = CW;
    const C1 = 145;
    const C2 = TW - C1;
    const RH = 18;
    let ty = doc.y;

    const rows = [
      ['Öğrenci Adı Soyadı', data.studentFullName],
      ['Sınıfı', data.studentClassName],
      ['Okul Numarası', data.studentSchoolNumber],
      ['Uyarı Tarihi', dateStr],
      ['Uyarı Numarası', `${data.warningNumber}. Uyarı`],
    ];

    // Header row
    doc.save();
    doc.rect(TL, ty, TW, RH).fillColor('#e8e8e8').fill();
    doc.restore();
    doc.fillColor('#000000').font('Kalin').fontSize(9);
    doc.text('ÖĞRENCİ BİLGİLERİ', TL, ty + 3, { width: TW, align: 'center' });
    ty += RH;

    // Data rows
    for (let i = 0; i < rows.length; i++) {
      const ry = ty + i * RH;

      if (i % 2 === 0) {
        doc.save();
        doc.rect(TL, ry, TW, RH).fillColor('#fafafa').fill();
        doc.restore();
      }

      doc.fillColor('#000000').font('Kalin').fontSize(9);
      doc.text(rows[i][0], TL + 6, ry + 3, { width: C1 - 12 });

      doc.font('Normal').fontSize(9);
      doc.text(rows[i][1], TL + C1 + 6, ry + 3, { width: C2 - 12 });
    }

    // Table borders
    const TH = RH + rows.length * RH;
    doc.save();
    doc.rect(TL, ty - RH, TW, TH).strokeColor('#000000').lineWidth(0.6).stroke();
    for (let i = 0; i <= rows.length; i++) {
      hr(doc, ty + i * RH, TL, TL + TW, 0.25);
    }
    doc.moveTo(TL + C1, ty - RH).lineTo(TL + C1, ty + rows.length * RH)
      .strokeColor('#000000').lineWidth(0.25).stroke();
    doc.restore();

    doc.y = ty + rows.length * RH;

    // ── YASAL DAYANAK & UYARI METNİ ──────────────────
    doc.moveDown(0.6);
    doc.font('Normal').fontSize(10).fillColor('#000000');

    doc.text(
      `${data.studentFullName} isimli öğrenci, ` +
      `aşağıda belirtilen davranışı sebebiyle Millî Eğitim Bakanlığı ` +
      `Ortaöğretim Kurumları Yönetmeliği'nin 157'nci maddesinin yedinci fıkrasının (a) bendi uyarınca ` +
      `yazılı olarak uyarılmıştır.`,
      { align: 'justify', lineGap: 2 }
    );

    // ── UYARI SEBEBİ KUTUSU ──────────────────────────
    doc.moveDown(0.5);
    const bx = ML;
    const bw = CW;

    doc.font('Kalin').fontSize(10);
    const h1 = doc.heightOfString('Uyarı Sebebi:', { width: bw - 24 });
    doc.font('Normal').fontSize(10);
    const h2 = doc.heightOfString(data.behaviorText, { width: bw - 24 });
    // İlgili madde satırı
    doc.font('Normal').fontSize(9);
    const artLine = `(${behaviorArticle})`;
    const artH = doc.heightOfString(artLine, { width: bw - 24 });
    let bh = 10 + h1 + 2 + h2 + 3 + artH + 10;

    let descH1 = 0, descH2 = 0;
    if (data.description) {
      doc.font('Kalin').fontSize(9);
      descH1 = doc.heightOfString('Ek Açıklama:', { width: bw - 24 });
      doc.font('Normal').fontSize(9);
      descH2 = doc.heightOfString(data.description, { width: bw - 24 });
      bh += 6 + descH1 + 2 + descH2;
    }

    const bt = doc.y;

    // Box border
    doc.save();
    doc.rect(bx, bt, bw, bh).strokeColor('#000000').lineWidth(0.6).stroke();
    doc.restore();

    let cy = bt + 8;

    // Uyarı Sebebi
    doc.font('Kalin').fontSize(10).fillColor('#000000');
    doc.text('Uyarı Sebebi:', bx + 12, cy, { width: bw - 24 });
    cy += h1 + 2;
    doc.font('Normal').fontSize(10);
    doc.text(data.behaviorText, bx + 12, cy, { width: bw - 24, lineGap: 1 });
    cy += h2 + 3;
    doc.font('Normal').fontSize(9).fillColor('#555555');
    doc.text(artLine, bx + 12, cy, { width: bw - 24 });
    cy += artH;
    doc.fillColor('#000000');

    // Ek Açıklama
    if (data.description) {
      cy += 6;
      doc.font('Kalin').fontSize(9).fillColor('#000000');
      doc.text('Ek Açıklama:', bx + 12, cy, { width: bw - 24 });
      cy += descH1 + 2;
      doc.font('Normal').fontSize(9);
      doc.text(data.description, bx + 12, cy, { width: bw - 24, lineGap: 1 });
    }

    doc.y = bt + bh;

    // ── ÖNCEKİ UYARI GEÇMİŞİ ─────────────────────────
    if (data.warningNumber > 1) {
      doc.moveDown(0.4);
      doc.font('Kalin').fontSize(9).fillColor('#b45309');
      doc.text(
        `Not: Bu öğrencinin daha önce ${data.warningNumber - 1} adet yazılı uyarısı bulunmaktadır. Bu belge ${data.warningNumber}. yazılı uyarıdır.`,
        { align: 'left', lineGap: 1 }
      );
      doc.fillColor('#000000');
    }

    // ── REHBERLİK SERVİSİ GÖRÜŞÜ ─────────────────────
    if (data.guidanceNote) {
      doc.moveDown(0.4);
      doc.font('Kalin').fontSize(9).fillColor('#000000');
      doc.text('Rehberlik Servisi Görüşü:', { continued: false });
      doc.font('Normal').fontSize(9);
      doc.text(data.guidanceNote, { align: 'justify', lineGap: 1 });
    }

    // ── DİSİPLİN KURULU UYARISI ──────────────────────
    if (data.warningNumber >= 3) {
      doc.moveDown(0.4);
      const dcY = doc.y;
      const dcH = 36;
      doc.save();
      doc.rect(ML, dcY, CW, dcH).fillColor('#fef2f2').fill();
      doc.rect(ML, dcY, CW, dcH).strokeColor('#dc2626').lineWidth(0.6).stroke();
      doc.restore();
      doc.font('Kalin').fontSize(9).fillColor('#dc2626');
      doc.text(
        '⚠ DİKKAT: Bu öğrenci 3 veya daha fazla yazılı uyarı almıştır. ' +
        'İlgili yönetmelik hükümleri gereğince disiplin kuruluna sevk işlemi değerlendirilmelidir.',
        ML + 10, dcY + 6, { width: CW - 20, align: 'left', lineGap: 1 }
      );
      doc.y = dcY + dcH;
      doc.fillColor('#000000');
    }

    // ── KAPANIŞ ───────────────────────────────────────
    doc.moveDown(0.5);
    doc.fillColor('#000000').font('Normal').fontSize(10);
    doc.text(
      'Bu uyarı, öğrencinin davranışlarını düzeltmesi amacıyla ' +
      'verilmiş olup, tekrarı hâlinde ilgili yönetmelik hükümleri ' +
      'doğrultusunda disiplin süreci başlatılacaktır.',
      { align: 'justify', lineGap: 2 }
    );

    // ── ÖĞRENCİ TEBELLÜĞ BEYANI VE İMZA ALANI ──────
    doc.fillColor('#000000');

    // İçeriğin hemen altına, küçük boşlukla yerleştir (sayfanın altına yapışmaz)
    doc.moveDown(1.2);
    hr(doc, doc.y, ML, RE, 1);
    doc.moveDown(0.4);

    // ── 1. KATMAN: BEYAN METNİ + ÖĞRENCİ İMZA KUTUSU ─
    // Bölüm başlığı
    doc.font('Kalin').fontSize(10).fillColor('#000000');
    doc.text('ÖĞRENCİ TEBELLÜĞ BEYANI', ML, doc.y, { width: CW, align: 'center' });
    doc.moveDown(0.35);

    const declText =
      'Okul idaresi, sınıf rehber öğretmeni ve okul rehber öğretmeni tarafından ' +
      'yukarıda belirtilen davranışım sebebiyle uyarıldım ve hatalı olduğumu anladım. ' +
      'Olumsuz davranışımın tekrarlanması durumunda bana uygulanabilecek yaptırımlar ' +
      'konusunda bilgilendirildim.';

    const stuColW = 115;
    const declTextW = CW - stuColW - 30;

    doc.font('Normal').fontSize(9);
    const declTextH = doc.heightOfString(declText, { width: declTextW, lineGap: 2 });
    const boxInnerH = Math.max(declTextH + 4, 60);
    const boxH = boxInnerH + 20;

    const boxY = doc.y;

    // Kutu çerçevesi
    doc.save();
    doc.rect(ML, boxY, CW, boxH).strokeColor('#000000').lineWidth(0.6).stroke();
    doc.restore();

    // Beyan metni (sol)
    doc.font('Normal').fontSize(9).fillColor('#000000');
    doc.text(declText, ML + 12, boxY + 10, { width: declTextW, lineGap: 2 });

    // Dikey ayırıcı
    const divX = ML + CW - stuColW - 10;
    doc.save();
    doc.moveTo(divX, boxY).lineTo(divX, boxY + boxH)
      .strokeColor('#cccccc').lineWidth(0.4).stroke();
    doc.restore();

    // Öğrenci (sağ bölüm)
    const stuX = divX + 6;
    const stuW = stuColW - 4;
    doc.font('Kalin').fontSize(8.5).fillColor('#000000');
    doc.text(data.studentFullName, stuX, boxY + 8, { width: stuW, align: 'center' });
    doc.font('Normal').fontSize(7.5);
    doc.text('Öğrenci', stuX, boxY + 21, { width: stuW, align: 'center' });
    const stuLineY = boxY + boxH - 24;
    hr(doc, stuLineY, stuX + stuW * 0.08, stuX + stuW * 0.92, 0.5);
    doc.font('Normal').fontSize(6.5).fillColor('#999999');
    doc.text('İmza', stuX, stuLineY + 3, { width: stuW, align: 'center' });
    doc.fillColor('#555555').font('Normal').fontSize(6.5);
    doc.text('Tarih: ..../..../..........', stuX, stuLineY + 12, { width: stuW, align: 'center' });

    doc.y = boxY + boxH;

    // ── 2. KATMAN: ÖĞRETMEN / DÜZENLEYEN İMZA SÜTUNLARI (sayfanın altına sabitlenmiş) ─
    // Bloğun toplam yüksekliği: isim+unvan(24) + imza boşluğu(42) + imza+tarih(22) + müdür(40) + footer(20) ≈ 148
    const bottomBlockH = 148;
    const pageBottomY = doc.page.height - doc.page.margins.bottom;
    const tSigY = pageBottomY - bottomBlockH;

    const tGap = 8;
    const tColW = (CW - tGap * 2) / 3;
    const tCol1X = ML;
    const tCol2X = ML + tColW + tGap;
    const tCol3X = ML + (tColW + tGap) * 2;

    // İmza çizgisi daha aşağıda → satır yüksekliği artırıldı (26 → 42)
    const tSigLineY = tSigY + 42;

    const drawTeacherCol = (x: number, name: string, role: string) => {
      doc.fillColor('#000000');
      if (name) {
        doc.font('Kalin').fontSize(8);
        doc.text(name, x, tSigY, { width: tColW, align: 'center' });
      }
      doc.font('Normal').fontSize(7.5);
      doc.text(role, x, tSigY + (name ? 11 : 3), { width: tColW, align: 'center' });
      hr(doc, tSigLineY, x + tColW * 0.08, x + tColW * 0.92, 0.5);
      doc.font('Normal').fontSize(6.5).fillColor('#999999');
      doc.text('İmza', x, tSigLineY + 3, { width: tColW, align: 'center' });
      doc.fillColor('#555555').font('Normal').fontSize(6.5);
      doc.text('Tarih: ..../..../..........', x, tSigLineY + 12, { width: tColW, align: 'center' });
    };

    drawTeacherCol(tCol1X, data.classTeacherName || '', 'Sınıf Rehber Öğretmeni');
    drawTeacherCol(tCol2X, data.schoolCounselorName || '', 'Okul Rehber Öğretmeni');
    drawTeacherCol(tCol3X, data.issuedBy || 'Okul Yönetimi', 'Düzenleyen');

    // ── OKUL MÜDÜRÜ ONAY ─────────────────────────────
    const principalY = tSigLineY + 48;
    doc.fillColor('#000000');
    if (data.principalName) {
      doc.font('Kalin').fontSize(9);
      doc.text(data.principalName, ML, principalY - 2, { width: CW, align: 'center' });
      doc.font('Normal').fontSize(7);
      doc.text('Okul Müdürü', ML, doc.y + 1, { width: CW, align: 'center' });
      const pLineY = doc.y + 8;
      hr(doc, pLineY, ML + CW * 3 / 8, ML + CW * 5 / 8, 0.4);
      doc.font('Normal').fontSize(7).fillColor('#999999');
      doc.text('Onay / İmza / Mühür', ML, pLineY + 2, { width: CW, align: 'center' });
    } else {
      hr(doc, principalY, ML + CW * 3 / 8, ML + CW * 5 / 8, 0.4);
      doc.font('Kalin').fontSize(9);
      doc.text('OKUL MÜDÜRÜ', ML, principalY + 3, { width: CW, align: 'center' });
      doc.font('Normal').fontSize(7).fillColor('#999999');
      doc.text('Onay / İmza / Mühür', ML, doc.y + 1, { width: CW, align: 'center' });
    }

    // ── FOOTER ────────────────────────────────────────
    // Sayfa taşmaması için mevcut y'den devam et
    doc.moveDown(1);
    doc.font('Normal').fontSize(6.5).fillColor('#bbbbbb');
    doc.text(
      `Bu belge ${fmtDate(new Date())} tarihinde düzenlenmiştir.`,
      { width: CW, align: 'center' }
    );

    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}
