import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface ParentNotificationData {
  schoolName: string;
  date: Date;
  student: {
    fullName: string;
    className: string;
    schoolNumber: string;
    parentName?: string;
  };
  absenceDay: 5 | 15 | 25;
  absenceData?: {
    excusedDays?: string;
    unexcusedDays?: string;
    totalDays?: string;
  };
  staff: {
    classTeacher?: string;
    schoolCounselor?: string;
    viceDirector?: string;
  };
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

function getAbsenceDayPhrase(absenceDay: 5 | 15 | 25): string {
  if (absenceDay === 5)  return '5. gününde';
  if (absenceDay === 15) return '5. ve 15. günlerinde';
  return '5., 15. ve 25. günlerinde';
}

const BLACK  = '#000000';
const BORDER = '#000000';

export async function generateParentNotificationPdf(
  data: ParentNotificationData,
  outputPath: string,
): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fonts = resolveFonts();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 40, left: 50, right: 50 },
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);

    const ML = 50;
    const CW = doc.page.width - ML * 2;  // 495.28

    let Y = 40;

    // ── Yardımcılar ──────────────────────────────────────────────

    /** Bölüm başlığı: siyah çerçeve, beyaz zemin, kalın metin */
    function sectionHeader(label: string): void {
      const H = 18;
      doc.save().rect(ML, Y, CW, H).strokeColor(BORDER).lineWidth(0.8).stroke().restore();
      doc.font('B').fontSize(9.5).fillColor(BLACK);
      doc.text(label, ML + 5, Y + 4, { width: CW - 10, lineBreak: false });
      Y += H;
    }

    /** Tablo sütun başlığı: siyah çerçeve, beyaz zemin, kalın metin */
    function tableColHeader(cols: { label: string; w: number }[], rowH = 20): void {
      doc.save().rect(ML, Y, CW, rowH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
      let x = ML;
      for (let i = 0; i < cols.length; i++) {
        doc.font('B').fontSize(8.5).fillColor(BLACK);
        doc.text(cols[i].label, x + 3, Y + (rowH - 9) / 2, {
          width: cols[i].w - 6,
          align: 'center',
          lineBreak: false,
        });
        if (i < cols.length - 1) {
          doc.save()
            .moveTo(x + cols[i].w, Y).lineTo(x + cols[i].w, Y + rowH)
            .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
        }
        x += cols[i].w;
      }
      Y += rowH;
    }

    function dataRow(
      cells: { value: string; w: number; align?: string; bold?: boolean }[],
      rowH = 22,
    ): void {
      doc.save().rect(ML, Y, CW, rowH).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
      let x = ML;
      for (let i = 0; i < cells.length; i++) {
        doc.font(cells[i].bold ? 'B' : 'R').fontSize(9).fillColor(BLACK);
        doc.text(cells[i].value, x + 4, Y + (rowH - 9) / 2, {
          width: cells[i].w - 8,
          align: (cells[i].align as any) || 'left',
          lineBreak: false,
        });
        if (i < cells.length - 1) {
          doc.save()
            .moveTo(x + cells[i].w, Y).lineTo(x + cells[i].w, Y + rowH)
            .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
        }
        x += cells[i].w;
      }
      Y += rowH;
    }

    // ── BAŞLIK ──────────────────────────────────────────────────

    doc.font('B').fontSize(11).fillColor(BLACK);
    doc.text('T.C.', ML, Y, { width: CW, align: 'center' });
    Y = doc.y + 2;

    doc.font('B').fontSize(11).fillColor(BLACK);
    doc.text(
      data.schoolName ? data.schoolName.toLocaleUpperCase('tr-TR') : 'OKUL ADI',
      ML, Y, { width: CW, align: 'center' },
    );
    Y = doc.y + 8;

    doc.font('B').fontSize(11).fillColor(BLACK);
    doc.text('ÖNLEME, MÜDAHALE VE YÖNLENDİRME KOMİSYONU', ML, Y, { width: CW, align: 'center' });
    Y = doc.y + 2;

    doc.font('B').fontSize(11).fillColor(BLACK);
    doc.text('VELİ BİLDİRİM TUTANAĞI', ML, Y, { width: CW, align: 'center' });
    Y = doc.y + 12;

    // ── TARİH / TOPLANTI YERİ TABLOSU ────────────────────────────

    const INFO_H = 22;
    const W_TLbl = 60;
    const W_TVal = 110;
    const W_YLbl = 95;
    const W_YVal = CW - W_TLbl - W_TVal - W_YLbl;

    doc.save().rect(ML, Y, CW, INFO_H).strokeColor(BORDER).lineWidth(0.5).stroke().restore();

    // "Tarih" etiketi hücresi
    doc.save().moveTo(ML + W_TLbl, Y).lineTo(ML + W_TLbl, Y + INFO_H)
      .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font('B').fontSize(9.5).fillColor(BLACK);
    doc.text('Tarih', ML + 4, Y + 6, { width: W_TLbl - 8, lineBreak: false });

    // Tarih değer hücresi
    doc.save().moveTo(ML + W_TLbl + W_TVal, Y).lineTo(ML + W_TLbl + W_TVal, Y + INFO_H)
      .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font('R').fontSize(9.5).fillColor(BLACK);
    doc.text(fmtDate(data.date), ML + W_TLbl + 4, Y + 6, { width: W_TVal - 8, lineBreak: false });

    // "Toplantı Yeri" etiketi hücresi
    const xYLbl = ML + W_TLbl + W_TVal;
    doc.save().moveTo(xYLbl + W_YLbl, Y).lineTo(xYLbl + W_YLbl, Y + INFO_H)
      .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    doc.font('B').fontSize(9.5).fillColor(BLACK);
    doc.text('Toplantı Yeri', xYLbl + 4, Y + 6, { width: W_YLbl - 8, lineBreak: false });

    // Toplantı Yeri değer hücresi
    doc.font('R').fontSize(9.5).fillColor(BLACK);
    doc.text('Müdür Yardımcısı Odası', xYLbl + W_YLbl + 4, Y + 6, {
      width: W_YVal - 8, lineBreak: false,
    });

    Y += INFO_H + 10;

    // ── II. ÖĞRENCİ BİLGİLERİ ────────────────────────────────────

    sectionHeader('II. ÖĞRENCİ BİLGİLERİ');

    const C_CLS  = 65;
    const C_NO   = 45;
    const C_NAME = 160;
    const C_NOTE = CW - C_CLS - C_NO - C_NAME;

    tableColHeader([
      { label: 'Sınıf / Şube',  w: C_CLS  },
      { label: 'No',             w: C_NO   },
      { label: 'Adı Soyadı',    w: C_NAME },
      { label: 'Toplantı Notu', w: C_NOTE },
    ]);

    const NOTE_H  = 26;
    const noteVal = data.student.parentName
      ? `Velisi ${data.student.parentName} toplantıya katılmıştır.`
      : 'Velisi ……………………….. toplantıya katılmıştır.';

    doc.save().rect(ML, Y, CW, NOTE_H).strokeColor(BORDER).lineWidth(0.5).stroke().restore();
    let rx = ML;
    const sCells = [
      { value: data.student.className,    w: C_CLS,  align: 'center' },
      { value: data.student.schoolNumber, w: C_NO,   align: 'center' },
      { value: data.student.fullName,     w: C_NAME, align: 'left'   },
      { value: noteVal,                   w: C_NOTE, align: 'left'   },
    ];
    for (let i = 0; i < sCells.length; i++) {
      doc.font('R').fontSize(9).fillColor(BLACK);
      doc.text(sCells[i].value, rx + 4, Y + 7, {
        width: sCells[i].w - 8,
        align: sCells[i].align as any,
        lineBreak: true,
      });
      if (i < sCells.length - 1) {
        doc.save()
          .moveTo(rx + sCells[i].w, Y).lineTo(rx + sCells[i].w, Y + NOTE_H)
          .strokeColor(BORDER).lineWidth(0.5).stroke().restore();
      }
      rx += sCells[i].w;
    }
    Y += NOTE_H + 10;

    // ── III. DEVAMSIZLIK DURUMU ──────────────────────────────────

    sectionHeader('III. DEVAMSIZLIK DURUMU');

    const C_OZ1 = 120;
    const C_OZ2 = 120;
    const C_TOT = 120;
    const C_DUR = CW - C_OZ1 - C_OZ2 - C_TOT;

    tableColHeader([
      { label: 'Özürlü Devamsızlık (gün)',  w: C_OZ1 },
      { label: 'Özürsüz Devamsızlık (gün)', w: C_OZ2 },
      { label: 'Toplam Devamsızlık (gün)',   w: C_TOT },
      { label: 'Durum',                      w: C_DUR },
    ]);

    dataRow([
      { value: data.absenceData?.excusedDays   ?? '',              w: C_OZ1, align: 'center' },
      { value: data.absenceData?.unexcusedDays ?? '',              w: C_OZ2, align: 'center' },
      { value: data.absenceData?.totalDays     ?? '',              w: C_TOT, align: 'center' },
      { value: 'Takip gerekli',                                    w: C_DUR, align: 'center' },
    ]);

    Y += 6;

    doc.font('R').fontSize(8.5).fillColor(BLACK);
    doc.text(
      'Not: Özürsüz devamsızlığın 10 günü, toplam devamsızlığın 30 günü aşması hâlinde öğrenci, ders puanları ne olursa olsun başarısız sayılır (OKY Md. 36/5-a).',
      ML, Y, { width: CW, align: 'left', lineGap: 1 },
    );
    Y = doc.y + 10;

    // ── ANA METİN ────────────────────────────────────────────────

    const FS  = 10;
    const IND = 15;
    const NUM_W = 18;
    const dayPhrase = getAbsenceDayPhrase(data.absenceDay);

    doc.font('R').fontSize(FS).fillColor(BLACK);
    doc.text(
      `Ortaöğretim Kurumları Yönetmeliği'nin 36. maddesinin 4. fıkrası uyarınca; devamsızlığın ${dayPhrase} öğrenci velisine yazılı ve dijital iletişim kanalları aracılığıyla tebligat yapılmış, yapılan tebligatlar kayıt altına alınmıştır. Bu tebligatlarda;`,
      ML, Y, { width: CW, align: 'justify', lineGap: 1 },
    );
    Y = doc.y + 5;

    const items = [
      'Öğrencinin özürlü/özürsüz devamsızlık yaptığı,',
      'Özürsüz devamsızlığının 10 günü, toplam devamsızlığının 30 günü aşması hâlinde ders puanları ne olursa olsun başarısız sayılacağı,',
      'Varsa mazeret belgelerinin (sağlık raporu, izin belgesi vb.) ilgili günü takip eden en geç 5 iş günü içinde okul yönetimine teslim edilmesi gerektiği',
    ];

    for (let i = 0; i < items.length; i++) {
      doc.font('B').fontSize(FS).fillColor(BLACK);
      doc.text(`${i + 1}.`, ML + IND, Y, { lineBreak: false, width: NUM_W });
      doc.font('R').fontSize(FS).fillColor(BLACK);
      doc.text(items[i], ML + IND + NUM_W, Y, {
        width: CW - IND - NUM_W,
        align: 'justify',
        lineGap: 1,
      });
      Y = doc.y + 3;
    }

    const closing = data.absenceDay >= 15
      ? `hususları veliye bildirilmiştir. Ayrıca Yönetmelik'in 59/A. maddesi kapsamında Önleme, Müdahale ve Yönlendirme Komisyonu; sınıf tekrarı riski bulunan öğrencinin velisini okula davet etmiş, devamsızlık nedenlerini ortadan kaldırmaya yönelik iş birliği çalışmaları yürütmüştür.`
      : 'hususları veliye bildirilmiştir.';

    doc.font('R').fontSize(FS).fillColor(BLACK);
    doc.text(closing, ML, Y, { width: CW, align: 'justify', lineGap: 1 });
    Y = doc.y + 10;

    doc.font('R').fontSize(FS).fillColor(BLACK);
    doc.text(
      'Yukarıda belirtilen hususlar tarafıma açıklanmış ve anlaşılmıştır. Öğrencimin okula düzenli devamını sağlayacağımı beyan ederim.',
      ML, Y, { width: CW, align: 'justify', lineGap: 1 },
    );
    Y = doc.y + 14;

    // ── VELİ İMZA ALANI ─────────────────────────────────────────

    const SIG_LABEL_W = 108;

    doc.font('B').fontSize(10).fillColor(BLACK);
    doc.text('Veli Adı Soyadı', ML, Y, { lineBreak: false });
    doc.font('R').fontSize(10).fillColor(BLACK);
    doc.text(' :', ML + SIG_LABEL_W, Y, { lineBreak: false });
    doc.font('R').fontSize(10).fillColor(BLACK);
    doc.text('Tarih: ....../......./.............', ML + CW - 155, Y, { lineBreak: false });

    Y += 22;

    doc.font('B').fontSize(10).fillColor(BLACK);
    doc.text('İmza', ML, Y, { lineBreak: false });
    doc.font('R').fontSize(10).fillColor(BLACK);
    doc.text(' :', ML + SIG_LABEL_W, Y, { lineBreak: false });
    doc.save()
      .moveTo(ML + SIG_LABEL_W + 16, Y + 14)
      .lineTo(ML + SIG_LABEL_W + 220, Y + 14)
      .strokeColor(BLACK).lineWidth(0.7).stroke().restore();

    Y += 30;

    // ── VII. KOMİSYON ÜYELERİ ───────────────────────────────────

    sectionHeader('VII. KOMİSYON ÜYELERİ');

    const C_GRV = 140;
    const C_ADI = 165;
    const C_IMZ = 120;
    const C_TRH = CW - C_GRV - C_ADI - C_IMZ;

    tableColHeader([
      { label: 'Görevi',      w: C_GRV },
      { label: 'Adı Soyadı', w: C_ADI },
      { label: 'İmza',       w: C_IMZ },
      { label: 'Tarih',      w: C_TRH },
    ]);

    const staffRows = [
      { role: 'Sınıf Rehber Öğretmeni', name: data.staff.classTeacher    || '' },
      { role: 'Okul Rehber Öğretmeni',  name: data.staff.schoolCounselor || '' },
      { role: 'Müdür Yardımcısı',       name: data.staff.viceDirector    || '' },
    ];

    for (const row of staffRows) {
      dataRow([
        { value: row.role, w: C_GRV },
        { value: row.name, w: C_ADI },
        { value: '',       w: C_IMZ },
        { value: '',       w: C_TRH },
      ]);
    }

    Y += 12;

    // ── FOOTER (sayfa altına sabitlenmiş) ────────────────────────

    const FOOTER_Y = doc.page.height - doc.page.margins.bottom - 18;
    if (Y < FOOTER_Y) Y = FOOTER_Y;

    doc.save()
      .moveTo(ML, Y).lineTo(ML + CW, Y)
      .strokeColor(BLACK).lineWidth(0.5).stroke().restore();
    Y += 5;

    doc.font('R').fontSize(7.5).fillColor(BLACK);
    doc.text(
      'Bu tutanak Ortaöğretim Kurumları Yönetmeliği Madde 36/4-5 ve Madde 59/A kapsamında düzenlenmiş olup 1 (bir) asıl 1 (bir) suret olarak hazırlanmıştır.',
      ML, Y, { width: CW, align: 'center', lineBreak: false },
    );

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}
