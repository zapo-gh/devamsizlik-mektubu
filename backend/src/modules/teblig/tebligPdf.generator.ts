import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface TebligData {
  schoolName: string;
  adiSoyadi: string;
  tcKimlikNo: string;
  unvani: string;
  gorevYeri: string;
  tebligTarihSayi: string;
  tebligatinKonusu: string;
  evrakYaziKarar: boolean;
  evrakSertifika: boolean;
  evrakBasariBelgesi: boolean;
  evrakAtamaGorevlendirme: boolean;
  evrakDiger: string;
  tebligatTarihi: string;
  tebligatSaati: string;
  tebligEdenAdSoyad: string;
  tebligEdenUnvani: string;
  tebligEdenTarih: string;
  tebellugEdenAdSoyad: string;
  tebellugEdenUnvani: string;
  tebellugEdenTarih: string;
}

function resolveFonts(): { regular: string; bold: string } {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'fonts'),
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(process.cwd(), 'backend', 'fonts'),
  ];
  for (const dir of candidates) {
    const regular = path.join(dir, 'times.ttf');
    const bold = path.join(dir, 'timesbd.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

export function generateTebligPdf(data: TebligData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const fonts = resolveFonts();
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 45, bottom: 45, left: 50, right: 50 },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const ML = doc.page.margins.left;
    const MT = doc.page.margins.top;
    const PW = doc.page.width;
    const CW = PW - ML - doc.page.margins.right;
    let curY = MT;
    const BLACK = '#000000';
    const PAD_X = 5;
    const PAD_Y = 6;

    const drawBorder = (x: number, y: number, w: number, h: number) => {
      doc.rect(x, y, w, h).stroke(BLACK);
    };

    // Draws border + text in a table cell
    const cell = (
      x: number, y: number, w: number, h: number,
      text: string, bold = false, size = 9,
    ) => {
      drawBorder(x, y, w, h);
      doc.font(bold ? 'B' : 'R').fontSize(size).fillColor(BLACK);
      doc.text(text, x + PAD_X, y + PAD_Y, { width: w - PAD_X * 2, lineBreak: true });
    };

    // ── HEADER ────────────────────────────────────────────────────────────
    doc.font('B').fontSize(12).fillColor(BLACK);
    doc.text('T.C.', ML, curY, { width: CW, align: 'center' });
    curY = doc.y + 1;
    doc.font('B').fontSize(12).fillColor(BLACK);
    doc.text('MİLLÎ EĞİTİM BAKANLIĞI', ML, curY, { width: CW, align: 'center' });
    curY = doc.y + 1;
    doc.font('B').fontSize(11).fillColor(BLACK);
    doc.text(data.schoolName || 'Okul Müdürlüğü', ML, curY, { width: CW, align: 'center' });
    curY = doc.y + 10;

    // ── TITLE ─────────────────────────────────────────────────────────────
    doc.font('B').fontSize(13).fillColor(BLACK);
    doc.text('TEBLİĞ – TEBELLÜĞ BELGESİ', ML, curY, {
      width: CW, align: 'center', underline: true,
    });
    curY = doc.y + 14;

    // ── MAIN TABLE ────────────────────────────────────────────────────────
    const C1 = 120;
    const C2 = 168;
    const C3 = 100;
    const C4 = CW - C1 - C2 - C3;
    const xC1 = ML;
    const xC2 = ML + C1;
    const xC3 = ML + C1 + C2;
    const xC4 = ML + C1 + C2 + C3;

    // Row 1: Adı Soyadı | value | T.C. Kimlik No | value
    const R1H = 30;
    cell(xC1, curY, C1, R1H, 'Adı Soyadı', true);
    cell(xC2, curY, C2, R1H, data.adiSoyadi || '');
    cell(xC3, curY, C3, R1H, 'T.C. Kimlik\nNo', true);
    cell(xC4, curY, C4, R1H, data.tcKimlikNo || '');
    curY += R1H;

    // Row 2: Unvanı / Branşı | value (merged)
    const R2H = 28;
    cell(xC1, curY, C1, R2H, 'Unvanı / Branşı', true);
    cell(xC2, curY, C2 + C3 + C4, R2H, data.unvani || '');
    curY += R2H;

    // Row 3: Görev Yeri | value (merged)
    const R3H = 28;
    cell(xC1, curY, C1, R3H, 'Görev Yeri', true);
    cell(xC2, curY, C2 + C3 + C4, R3H, data.gorevYeri || '');
    curY += R3H;

    // Row 4: Tebliğ Edilen Yazı... | value (merged, tall row for label)
    const R4H = 54;
    cell(xC1, curY, C1, R4H, 'Tebliğ Edilen Yazı,\nOnay veya Kararın\nTarih ve Sayısı', true);
    cell(xC2, curY, C2 + C3 + C4, R4H, data.tebligTarihSayi || '');
    curY += R4H;

    // Row 5: Tebligatın Konusu | value (merged)
    const R5H = 32;
    cell(xC1, curY, C1, R5H, 'Tebligatın Konusu', true);
    cell(xC2, curY, C2 + C3 + C4, R5H, data.tebligatinKonusu || '');
    curY += R5H;

    // Row 6: Tebliğ Edilen Evrak | checkboxes (merged)
    const R6H = 54;
    cell(xC1, curY, C1, R6H, 'Tebliğ Edilen Evrak', true);
    drawBorder(xC2, curY, C2 + C3 + C4, R6H);

    // Draw checkboxes manually
    const BOX = 7;
    const chkY1 = curY + 9;
    const chkY2 = curY + 31;

    const drawCheckbox = (x: number, y: number, checked: boolean, label: string) => {
      doc.rect(x, y, BOX, BOX).stroke(BLACK);
      if (checked) {
        doc.moveTo(x + 1, y + 3.5)
          .lineTo(x + 3, y + 6)
          .lineTo(x + 6.5, y + 1)
          .lineWidth(0.8)
          .stroke(BLACK);
        doc.lineWidth(0.5);
      }
      doc.font('R').fontSize(9).fillColor(BLACK);
      doc.text(label, x + BOX + 3, y, { lineBreak: false });
    };

    let cx = xC2 + PAD_X;
    drawCheckbox(cx, chkY1, data.evrakYaziKarar, 'Yazı/Karar');   cx += 72;
    drawCheckbox(cx, chkY1, data.evrakSertifika, 'Sertifika');     cx += 65;
    drawCheckbox(cx, chkY1, data.evrakBasariBelgesi, 'Başarı Belgesi'); cx += 90;
    drawCheckbox(cx, chkY1, data.evrakAtamaGorevlendirme, 'Atama/Görevlendirme');

    cx = xC2 + PAD_X;
    const digerChecked = !!(data.evrakDiger && data.evrakDiger.trim());
    drawCheckbox(cx, chkY2, digerChecked, `Diğer: ${data.evrakDiger || '……………………………'}`);
    curY += R6H;

    // Row 7: Tebligat Tarihi | value | Tebligat Saati | value
    const R7H = 30;
    cell(xC1, curY, C1, R7H, 'Tebligat Tarihi', true);
    cell(xC2, curY, C2, R7H, data.tebligatTarihi || '');
    cell(xC3, curY, C3, R7H, 'Tebligat Saati', true);
    cell(xC4, curY, C4, R7H, data.tebligatSaati || '');
    curY += R7H;

    curY += 22;

    // ── SIGNATURE TABLE ───────────────────────────────────────────────────
    const SIG_W = CW / 2;
    const SIG_HDR_H = 26;
    const SIG_BODY_H = 110;

    // Header row
    drawBorder(ML, curY, SIG_W, SIG_HDR_H);
    doc.font('B').fontSize(11).fillColor(BLACK);
    doc.text('TEBLİĞ EDEN', ML, curY + 7, { width: SIG_W, align: 'center' });

    drawBorder(ML + SIG_W, curY, SIG_W, SIG_HDR_H);
    doc.text('TEBELLÜĞ EDEN', ML + SIG_W, curY + 7, { width: SIG_W, align: 'center' });
    curY += SIG_HDR_H;

    // Body row
    drawBorder(ML, curY, SIG_W, SIG_BODY_H);
    drawBorder(ML + SIG_W, curY, SIG_W, SIG_BODY_H);

    const SIG_LH = 22;
    const leftLines = [
      `Ad Soyad  :  ${data.tebligEdenAdSoyad || '…………………………………'}`,
      `Unvanı      :  ${data.tebligEdenUnvani || '…………………………………'}`,
      `İmza          :  …………………………………`,
      `Tarih          :  ${data.tebligEdenTarih || '…… / …… / 20……'}`,
    ];
    const rightLines = [
      `Ad Soyad  :  ${data.tebellugEdenAdSoyad || '…………………………………'}`,
      `Unvanı      :  ${data.tebellugEdenUnvani || '…………………………………'}`,
      `İmza          :  …………………………………`,
      `Tarih          :  ${data.tebellugEdenTarih || '…… / …… / 20……'}`,
    ];

    doc.font('R').fontSize(9).fillColor(BLACK);
    let sy = curY + 8;
    for (const line of leftLines) {
      doc.text(line, ML + 10, sy, { width: SIG_W - 20, lineBreak: false });
      sy += SIG_LH;
    }
    sy = curY + 8;
    for (const line of rightLines) {
      doc.text(line, ML + SIG_W + 10, sy, { width: SIG_W - 20, lineBreak: false });
      sy += SIG_LH;
    }
    curY += SIG_BODY_H + 15;

    // ── NOTE ──────────────────────────────────────────────────────────────
    const noteText =
      "Not: Bu belge 7201 sayılı Tebligat Kanunu'nun 2. maddesi uyarınca kurumda görevli memur " +
      "vasıtasıyla yapılan tebligatı belgelemek amacıyla iki nüsha düzenlenmiştir. " +
      "Bir nüsha tebliğ edilen personele verilir, bir nüsha okul idaresinde muhafaza edilir.";
    doc.font('R').fontSize(8).fillColor('#444444');
    doc.text(noteText, ML, curY, { width: CW, align: 'left' });

    doc.end();
  });
}
