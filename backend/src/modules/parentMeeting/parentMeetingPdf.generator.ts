import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ParentMeetingStudent {
  orderNo: number;
  studentFullName: string;
  parentFullName?: string;
}

export interface ParentMeetingPdfData {
  schoolName: string;
  className: string;   // e.g. "9/A" or "9-A"
  meetingDate: Date;
  schoolYear: string;  // e.g. "2025-2026"
  term: string;        // e.g. "1. DÖNEM" or "2. DÖNEM"
  students: ParentMeetingStudent[];
}

function resolveFonts(): { regular: string; bold: string } {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'fonts'),
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(process.cwd(), 'backend', 'fonts'),
    'C:/Windows/Fonts',
  ];
  for (const dir of candidates) {
    const regular = path.join(dir, 'times.ttf');
    const bold    = path.join(dir, 'timesbd.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold };
    }
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
}

function fmtDate(date: Date): string {
  const d  = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
}

const BLACK = '#000000';

export async function generateParentMeetingPdf(
  items: ParentMeetingPdfData[],
  outputPath: string,
): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fonts = resolveFonts();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const ML = doc.page.margins.left;
    const MR = doc.page.margins.right;
    const PW = doc.page.width;
    const CW = PW - ML - MR;

    const drawPage = (item: ParentMeetingPdfData, startY: number) => {
      let curY = startY;

      // ── Başlık ────────────────────────────────────────────────────────────
      doc.font('B').fontSize(13).fillColor(BLACK);
      doc.text(item.schoolName.toLocaleUpperCase('tr-TR'), ML, curY, {
        width: CW, align: 'center',
      });
      curY = doc.y + 4;

      const title = `${item.schoolYear} EĞİTİM ÖĞRETİM YILI ${item.term} VELİ TOPLANTISI KATILIM İMZA SİRKÜSÜ`;
      doc.font('B').fontSize(11).fillColor(BLACK);
      doc.text(title, ML, curY, { width: CW, align: 'center' });
      curY = doc.y + 10;

      // ── Sınıf / Tarih bilgisi ─────────────────────────────────────────────
      doc.font('B').fontSize(11).fillColor(BLACK);
      doc.text(`Sınıf/Şube : ${item.className}`, ML, curY, { width: CW / 2, align: 'left' });
      doc.font('B').fontSize(11).fillColor(BLACK);
      doc.text(`Tarih : ${fmtDate(item.meetingDate)}`, ML + CW / 2, curY, {
        width: CW / 2, align: 'right',
      });
      curY = doc.y + 8;

      // ── Tablo ─────────────────────────────────────────────────────────────
      // Sütun genişlikleri
      const COL_SIRA   = 32;
      const COL_OGRENCI = 140;
      const COL_VELI   = 140;
      const COL_YAKINLIK = 90;
      const COL_IMZA   = CW - COL_SIRA - COL_OGRENCI - COL_VELI - COL_YAKINLIK;

      const HEADER_H = 30;
      const ROW_H    = 22;

      const cols = [
        { label: 'Sıra\nNo',             w: COL_SIRA },
        { label: 'Öğrenci Adı Soyadı',   w: COL_OGRENCI },
        { label: 'Veli Adı Soyadı',       w: COL_VELI },
        { label: 'Yakınlık\nDerecesi',    w: COL_YAKINLIK },
        { label: 'Veli İmzası',           w: COL_IMZA },
      ];

      // Başlık satırı – hafif gri arka plan
      let colX = ML;
      doc.save().rect(ML, curY, CW, HEADER_H).fillColor('#d8d8d8').fill().restore();
      doc.save().rect(ML, curY, CW, HEADER_H).strokeColor(BLACK).lineWidth(0.8).stroke().restore();

      for (const col of cols) {
        doc.font('B').fontSize(9).fillColor(BLACK);
        doc.text(col.label, colX + 2, curY + 3, {
          width: col.w - 4,
          align: 'center',
          lineBreak: true,
        });
        colX += col.w;
      }

      // Dikey çizgiler başlık
      colX = ML;
      for (let i = 0; i < cols.length - 1; i++) {
        colX += cols[i].w;
        doc.save().moveTo(colX, curY).lineTo(colX, curY + HEADER_H)
          .strokeColor(BLACK).lineWidth(0.6).stroke().restore();
      }
      curY += HEADER_H;

      // Veri satırları
      for (const student of item.students) {
        // Arka plan (alternating renk yok – sade görünüm)
        doc.save().rect(ML, curY, CW, ROW_H).strokeColor(BLACK).lineWidth(0.5).stroke().restore();

        colX = ML;
        const values = [
          String(student.orderNo),
          student.studentFullName,
          student.parentFullName || '',
          '',
          '',
        ];

        for (let i = 0; i < cols.length; i++) {
          doc.font(i === 0 ? 'B' : 'R').fontSize(8.5).fillColor(BLACK);
          doc.text(values[i], colX + 3, curY + 7, {
            width: cols[i].w - 6,
            lineBreak: false,
            align: i === 0 ? 'center' : 'left',
          });
          if (i < cols.length - 1) {
            doc.save().moveTo(colX + cols[i].w, curY).lineTo(colX + cols[i].w, curY + ROW_H)
              .strokeColor(BLACK).lineWidth(0.5).stroke().restore();
          }
          colX += cols[i].w;
        }

        curY += ROW_H;

        // Yeni sayfa gerekiyor mu?
        if (curY > doc.page.height - doc.page.margins.bottom - 40 && item.students.indexOf(student) < item.students.length - 1) {
          doc.addPage();
          curY = doc.page.margins.top;
        }
      }
    };

    for (let i = 0; i < items.length; i++) {
      if (i > 0) doc.addPage();
      drawPage(items[i], doc.page.margins.top);
    }

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}
