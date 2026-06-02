import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export interface GradeReportPdfData {
  // Öğrenci bilgileri
  studentFullName: string;
  studentClassName: string;
  studentSchoolNumber?: string;
  studentTcKimlikNo?: string;
  // Veli bilgileri (DB'den gelen, boş bırakılabilir)
  parentFullName?: string;
  parentPhone?: string;
  // Başarısız dersler
  failedSubjects: { subject: string; grade: number }[];
  // Okul / komisyon bilgileri
  schoolName: string;
  districtName?: string;    // "AKHİSAR İLÇE MİLLÎ EĞİTİM MÜDÜRLÜĞÜ" gibi
  schoolYear: string;        // "2025 / 2026"
  meetingDate: Date;
  // Personel
  vicePrincipalName?: string;
  counselorName?: string;
  classTeacherName?: string;
}

function resolveFonts(): { regular: string; bold: string; italic: string } {
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', 'fonts'),
    path.resolve(process.cwd(), 'fonts'),
    path.resolve(process.cwd(), 'backend', 'fonts'),
    'C:/Windows/Fonts',
  ];
  for (const dir of candidates) {
    const regular = path.join(dir, 'times.ttf');
    const bold = path.join(dir, 'timesbd.ttf');
    if (fs.existsSync(regular) && fs.existsSync(bold)) {
      return { regular, bold, italic: regular };
    }
  }
  return { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' };
}

function fmtDate(date: Date): string {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd} / ${mm} / ${d.getFullYear()}`;
}

// ── Renk sabitleri ────────────────────────────────────────────────────────────
const SECTION_FILL = '#d0d0d0';  // hafif gri – bölüm başlıkları arka planı
const WHITE        = '#ffffff';
const BLACK        = '#000000';
const GRAY_LIGHT   = '#f5f5f5'; // kullanılmıyor ama uyumluluk için

/**
 * Şablona birebir uyan "VELİ BİLGİLENDİRME VE TEBLİĞ FORMU" PDF belgesi
 */
export async function generateGradeReportPdf(
  data: GradeReportPdfData,
  outputPath: string,
): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fonts = resolveFonts();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 40, bottom: 30, left: 50, right: 50 },
      bufferPages: true,
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    doc.registerFont('R', fonts.regular);
    doc.registerFont('B', fonts.bold);
    doc.registerFont('I', fonts.italic);

    const ML  = doc.page.margins.left;
    const MR  = doc.page.margins.right;
    const PW  = doc.page.width;
    const CW  = PW - ML - MR;
    const RE  = PW - MR;

    // ─── Yardımcı çizgiler ────────────────────────────────────────────────────
    const hrLine = (y: number, lw = 0.5, color = BLACK) => {
      doc.save().moveTo(ML, y).lineTo(RE, y)
        .strokeColor(color).lineWidth(lw).stroke().restore();
    };

    const sectionHeader = (title: string, y: number): number => {
      const H = 17;
      // Fill önce, border üste
      doc.save().rect(ML, y, CW, H).fillColor(SECTION_FILL).fill().restore();
      doc.save().rect(ML, y, CW, H).strokeColor(BLACK).lineWidth(0.6).stroke().restore();
      doc.font('B').fontSize(10).fillColor(BLACK);
      doc.text(title, ML + 6, y + 4, { width: CW - 12, lineBreak: false });
      doc.fillColor(BLACK);
      return y + H;
    };

    const outerRect = (x: number, y: number, w: number, h: number, lw = 0.6) => {
      doc.save().rect(x, y, w, h).strokeColor(BLACK).lineWidth(lw).stroke().restore();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 1. ANTET
    // ─────────────────────────────────────────────────────────────────────────
    let curY = 40;

    doc.font('B').fontSize(12).fillColor(BLACK);
    doc.text('T.C.', ML, curY, { width: CW, align: 'center' });
    curY = doc.y;

    const district = data.districtName || 'MİLLÎ EĞİTİM MÜDÜRLÜĞÜ';
    doc.font('B').fontSize(12);
    doc.text(district.toLocaleUpperCase('tr-TR'), ML, curY, { width: CW, align: 'center' });
    curY = doc.y;

    doc.font('B').fontSize(12);
    doc.text(data.schoolName.toLocaleUpperCase('tr-TR'), ML, curY, { width: CW, align: 'center' });
    curY = doc.y + 4;

    hrLine(curY, 1.2);
    curY += 2;
    hrLine(curY, 0.4);
    curY += 6;

    // Belge başlığı
    doc.font('B').fontSize(11);
    doc.text(
      'ÖNLEME, MÜDAHALE VE YÖNLENDİRME KOMİSYONU  |  VELİ BİLGİLENDİRME VE TEBLİĞ FORMU',
      ML, curY, { width: CW, align: 'center' },
    );
    curY = doc.y + 6;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Üst bilgi çubuğu: Eğitim-Öğretim Yılı | Toplantı Tarihi
    // ─────────────────────────────────────────────────────────────────────────
    const ROW_H = 18;
    const HALF  = CW / 2;

    outerRect(ML, curY, CW, ROW_H);
    // Dikey ayırıcı
    doc.save().moveTo(ML + HALF, curY).lineTo(ML + HALF, curY + ROW_H)
      .strokeColor(BLACK).lineWidth(0.5).stroke().restore();

    // Left: label + value (continued to avoid widthOfString issues with custom fonts)
    doc.font('B').fontSize(10).fillColor(BLACK);
    doc.text('Eğitim-Öğretim Yılı: ', ML + 4, curY + 4, {
      continued: true, lineBreak: false, width: HALF - 8,
    });
    doc.font('R').fontSize(10).fillColor(BLACK);
    doc.text(data.schoolYear, { lineBreak: false });

    // Right: use explicit x,y (cursor is now in left half, explicit y overrides)
    doc.font('B').fontSize(10).fillColor(BLACK);
    doc.text('Komisyon Toplantı Tarihi: ', ML + HALF + 4, curY + 4, {
      continued: true, lineBreak: false, width: HALF - 8,
    });
    doc.font('R').fontSize(10).fillColor(BLACK);
    doc.text(fmtDate(data.meetingDate), { lineBreak: false });

    curY += ROW_H + 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 3. ÖĞRENCİ VE VELİ BİLGİLERİ
    // ─────────────────────────────────────────────────────────────────────────
    curY = sectionHeader('ÖĞRENCİ VE VELİ BİLGİLERİ', curY);

    const drawInfoTable = (rows: [string, string, string, string][], startY: number): number => {
      const RH      = 18;
      // Etiket sağa hizalı → ":" karakteri hep aynı x konumunda hizalanır
      const LABEL_W = 112; // "Öğrenci Adı Soyadı :" sığacak kadar
      const GAP     = 5;   // ":" ile değer arasındaki boşluk
      const VAL_W   = HALF - LABEL_W - GAP - 10;

      let y = startY;
      for (let ri = 0; ri < rows.length; ri++) {
        const [l1, v1, l2, v2] = rows[ri];

        doc.save().rect(ML, y, CW, RH).strokeColor(BLACK).lineWidth(0.5).stroke().restore();
        doc.save().moveTo(ML + HALF, y).lineTo(ML + HALF, y + RH)
          .strokeColor(BLACK).lineWidth(0.4).stroke().restore();

        // Sol: etiket (sağa hizalı — ":" ucu hep aynı noktada)
        doc.font('B').fontSize(9.5).fillColor(BLACK);
        doc.text(l1, ML + 5, y + 5, { width: LABEL_W, align: 'right', lineBreak: false });
        // Sol: değer (":" dan sonra GAP boşlukla başlar)
        doc.font('R').fontSize(9.5).fillColor(BLACK);
        doc.text(v1 || '..............................', ML + 5 + LABEL_W + GAP, y + 5, {
          width: VAL_W, lineBreak: false,
        });

        if (l2) {
          // Sağ: etiket (sağa hizalı)
          doc.font('B').fontSize(9.5).fillColor(BLACK);
          doc.text(l2, ML + HALF + 5, y + 5, { width: LABEL_W, align: 'right', lineBreak: false });
          // Sağ: değer
          doc.font('R').fontSize(9.5).fillColor(BLACK);
          doc.text(v2 || '..............................', ML + HALF + 5 + LABEL_W + GAP, y + 5, {
            width: VAL_W, lineBreak: false,
          });
        }

        y += RH;
      }
      return y;
    };

    const infoRows: [string, string, string, string][] = [
      ['Öğrenci Adı Soyadı :', data.studentFullName, 'Veli Adı Soyadı :', data.parentFullName || ''],
      ['Sınıf / Şube :', data.studentClassName, 'Yakınlığı :', 'Anne □   Baba □   Diğer □'],
      ['Okul Numarası :', data.studentSchoolNumber || '', 'Telefon :', data.parentPhone || ''],
    ];
    curY = drawInfoTable(infoRows, curY);
    curY += 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. AKADEMİK DURUM
    // ─────────────────────────────────────────────────────────────────────────
    curY = sectionHeader('AKADEMİK DURUM VE BAŞARISIZ OLUNAN DERSLER  (OKY Md. 69/1-c)', curY);

    // Açıklama metni
    const introText =
      `Yapılan inceleme sonucunda öğrencinin 3 (üç)'ten fazla dersten başarısız olduğu tespit edilmiştir. ` +
      `OKY Madde 69/1-c uyarınca bu durumun yılsonunda da devam etmesi hâlinde öğrenci sınıfını tekrar riski bulunmaktadır.`;

    doc.font('R').fontSize(9.5).fillColor(BLACK);
    const introH = doc.heightOfString(introText, { width: CW - 12, lineGap: 2 });
    const introBoxH = introH + 12;

    outerRect(ML, curY, CW, introBoxH);
    doc.font('R').fontSize(9.5).fillColor(BLACK);
    doc.text(introText, ML + 6, curY + 6, { width: CW - 12, lineGap: 2, align: 'justify' });

    // "sınıfını tekrar riski" bold kısmı için üzerine yaz
    // (PDFKit'te gerçek mixed-bold paragraf yoktur; sadece alt çizgi ile vurgulayabiliriz,
    //  ya da tüm metni R ile yazıp geçiyoruz – kabul edilebilir)
    curY += introBoxH + 8;

    // Başarısız ders listesi – 2 sütun
    const subjects = data.failedSubjects.slice(0, 12);
    const colCount = 2;
    const colW     = CW / colCount;
    const ITEM_H   = 16;
    const listRows = Math.max(Math.ceil(subjects.length / colCount), 4);
    const listH    = listRows * ITEM_H;

    // Dış çerçeve
    doc.save().rect(ML, curY, CW, listH).strokeColor(BLACK).lineWidth(0.5).stroke().restore();
    // Dikey ayırıcı
    doc.save().moveTo(ML + colW, curY).lineTo(ML + colW, curY + listH)
      .strokeColor(BLACK).lineWidth(0.4).stroke().restore();

    for (let i = 0; i < listRows * 2; i++) {
      const col = i < listRows ? 0 : 1;
      const row = i < listRows ? i : i - listRows;
      const x   = ML + col * colW + 5;
      const y   = curY + row * ITEM_H + 4;

      // Yatay ayırıcı (son satır hariç)
      if (row < listRows - 1) {
        const lx = ML + col * colW;
        doc.save().moveTo(lx, curY + (row + 1) * ITEM_H)
          .lineTo(lx + colW, curY + (row + 1) * ITEM_H)
          .strokeColor('#cccccc').lineWidth(0.3).stroke().restore();
      }

      const idx = col === 0 ? row : row + listRows;
      const subj = subjects[idx];

      if (subj) {
        const gradeStr = subj.grade.toFixed(2);
        const GRADE_W  = 40;
        const SUBJ_W   = colW - 12 - GRADE_W;

        doc.font('R').fontSize(9.5).fillColor(BLACK);
        doc.text(`${idx + 1}.  ${subj.subject}`, x, y, { width: SUBJ_W, lineBreak: false });
        doc.font('B').fontSize(9.5).fillColor('#cc0000');
        doc.text(gradeStr, ML + col * colW + colW - GRADE_W - 4, y, { width: GRADE_W, align: 'right', lineBreak: false });
        doc.fillColor(BLACK);
      } else if (idx < listRows * 2) {
        doc.font('R').fontSize(9.5).fillColor(BLACK);
        doc.text(`${idx + 1}.  `, x, y, { width: colW - 10, lineBreak: false });
      }
    }

    curY += listH + 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. VELİYE YÖNELİK BİLGİLENDİRME VE ÖNERİLER
    // ─────────────────────────────────────────────────────────────────────────
    curY = sectionHeader('VELİYE YÖNELİK BİLGİLENDİRME VE ÖNERİLER', curY);

    const suggestions = [
      'Öğrencinin okula düzenli ve zamanında devamının sağlanması.',
      'Günlük ders çalışma planının takip edilmesi ve uygun çalışma ortamının sağlanması.',
      'Sınıf rehber öğretmeni ve okul rehberlik servisiyle düzenli iletişim kurulması; gerektiğinde bireysel görüşme talep edilmesi.',
      'E-Okul Veli Bilgilendirme Sistemi üzerinden öğrencinin devam, not ve davranış durumunun takip edilmesi.',
    ];

    const suggLineGap = 2;
    doc.font('R').fontSize(9.5);
    let totalSuggH = 10;
    for (const s of suggestions) {
      totalSuggH += doc.heightOfString(s, { width: CW - 24, lineGap: suggLineGap }) + 4;
    }
    const suggBoxH = totalSuggH;
    doc.save().rect(ML, curY, CW, suggBoxH).strokeColor(BLACK).lineWidth(0.5).stroke().restore();

    let sy = curY + 6;
    for (let i = 0; i < suggestions.length; i++) {
      doc.font('R').fontSize(9.5).fillColor(BLACK);
      doc.text(`${i + 1}.  `, ML + 6, sy, { lineBreak: false });
      if (i === 3) doc.font('B').fontSize(9.5);
      doc.text(suggestions[i], ML + 22, sy, { width: CW - 30, lineGap: suggLineGap, align: 'justify' });
      doc.font('R').fontSize(9.5);
      sy = doc.y + 3;
    }

    curY += suggBoxH + 10;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. VELİ TEBLİĞ BEYANI VE İMZALAR
    // ─────────────────────────────────────────────────────────────────────────
    curY = sectionHeader('VELİ TEBLİĞ BEYANI VE İMZALAR', curY);

    const declarationText =
      `Bu form ile öğrencimin 3 (üç)'ten fazla dersten başarısız olduğu konusunda bilgilendirildiğimi; ` +
      `OKY Madde 69/1-c uyarınca bu durumun yılsonunda da devam etmesi hâlinde öğrencimin sınıf tekrarı ` +
      `riskiyle karşılaşacağını anladığımı; okul yönetimi ve rehberlik servisiyle iş birliği yapacağımı ` +
      `kabul ve beyan ederim.`;

    const declW    = CW;
    doc.font('R').fontSize(9.5);
    const declH_t  = doc.heightOfString(declarationText, { width: declW - 12, lineGap: 2 });
    const declBoxH = declH_t + 12;

    doc.save().rect(ML, curY, CW, declBoxH).strokeColor(BLACK).lineWidth(0.5).stroke().restore();
    doc.font('R').fontSize(9.5).fillColor(BLACK);
    doc.text(declarationText, ML + 6, curY + 6, { width: declW - 12, lineGap: 2, align: 'justify' });
    curY += declBoxH + 8;

    // ── İmza tablosu ──────────────────────────────────────────────────────────
    // Sol: VELİ  |  Sağ: KOMİSYON ÜYELERİ ADINA
    const sigBoxH   = 105;
    const leftW     = CW * 0.35;
    const rightW    = CW - leftW;
    const HDR_H     = 14;
    const SUBHDR_H  = 13;
    const commBodyH = sigBoxH - HDR_H - SUBHDR_H;
    const mRowH     = commBodyH / 3;

    const colGörevi  = rightW * 0.35;
    const colAdSoyad = rightW * 0.40;
    const colImza    = rightW * 0.25;
    const commHeaderY = curY + HDR_H;
    const hx = [
      ML + leftW,
      ML + leftW + colGörevi,
      ML + leftW + colGörevi + colAdSoyad,
    ];

    // 1) Fill önce (border fill'in üstünde kalacak)
    doc.save().rect(ML,         curY, leftW,  HDR_H).fillColor(SECTION_FILL).fill().restore();
    doc.save().rect(ML + leftW, curY, rightW, HDR_H).fillColor(SECTION_FILL).fill().restore();
    doc.save().rect(ML + leftW, commHeaderY, rightW, SUBHDR_H).fillColor(SECTION_FILL).fill().restore();

    // 2) Dış çerçeve + iç çizgiler (fill'in üstüne çizilir)
    doc.save().rect(ML, curY, CW, sigBoxH).strokeColor(BLACK).lineWidth(0.6).stroke().restore();
    // Başlık alt çizgisi
    doc.save().moveTo(ML, curY + HDR_H).lineTo(ML + CW, curY + HDR_H)
      .strokeColor(BLACK).lineWidth(0.5).stroke().restore();
    // Alt başlık çizgisi
    doc.save().moveTo(ML + leftW, commHeaderY + SUBHDR_H).lineTo(ML + CW, commHeaderY + SUBHDR_H)
      .strokeColor(BLACK).lineWidth(0.4).stroke().restore();
    // VELİ | KOMİSYON dikey ayırıcı
    doc.save().moveTo(ML + leftW, curY).lineTo(ML + leftW, curY + sigBoxH)
      .strokeColor(BLACK).lineWidth(0.5).stroke().restore();
    // Komisyon sütun dikey ayırıcılar
    doc.save().moveTo(hx[1], commHeaderY).lineTo(hx[1], curY + sigBoxH)
      .strokeColor('#999999').lineWidth(0.4).stroke().restore();
    doc.save().moveTo(hx[2], commHeaderY).lineTo(hx[2], curY + sigBoxH)
      .strokeColor('#999999').lineWidth(0.4).stroke().restore();
    // Komisyon üye satır ayırıcılar
    for (let mi = 1; mi < 3; mi++) {
      const sepY = commHeaderY + SUBHDR_H + mRowH * mi;
      doc.save().moveTo(ML + leftW, sepY).lineTo(ML + CW, sepY)
        .strokeColor('#bbbbbb').lineWidth(0.3).stroke().restore();
    }

    // 3) Metin en son
    doc.font('B').fontSize(10).fillColor(BLACK);
    doc.text('VELİ', ML, curY + 2.5, { width: leftW, align: 'center', lineBreak: false });
    doc.text('KOMİSYON ÜYELERİ ADINA', ML + leftW, curY + 2.5, { width: rightW, align: 'center', lineBreak: false });

    doc.font('B').fontSize(9).fillColor(BLACK);
    doc.text('Görevi',     hx[0] + 3, commHeaderY + 2, { width: colGörevi - 6,  lineBreak: false });
    doc.text('Adı Soyadı', hx[1] + 3, commHeaderY + 2, { width: colAdSoyad - 6, lineBreak: false });
    doc.text('İmza',       hx[2] + 3, commHeaderY + 2, { width: colImza - 6,    lineBreak: false });

    const commMembers = [
      { role: 'Müdür Yardımcısı',     name: data.vicePrincipalName || '' },
      { role: 'Rehber Öğretmen',       name: data.counselorName     || '' },
      { role: 'Sınıf Rehber Öğretmeni', name: data.classTeacherName  || '' },
    ];
    let mY = commHeaderY + SUBHDR_H;
    for (const m of commMembers) {
      const textY = mY + mRowH / 2 - 4;
      doc.font('R').fontSize(9).fillColor(BLACK);
      doc.text(m.role, hx[0] + 3, textY, { width: colGörevi - 6,  lineBreak: false });
      doc.font('B').fontSize(9);
      doc.text(m.name, hx[1] + 3, textY, { width: colAdSoyad - 6, lineBreak: false });
      mY += mRowH;
    }

    // Veli alanı içi — etiket sağa hizalı, ":" hep aynı x'te
    const veliContentY = curY + HDR_H;
    const veliLabels   = ['Tarih', 'Adı Soyadı', 'İmza'];
    const veliSpacing  = (sigBoxH - HDR_H) / (veliLabels.length + 1);
    const VELI_START   = ML + 6;   // sol kenardan az boşluk
    const VELI_LBL_W   = 55;       // "Adı Soyadı" sığacak kadar
    const VELI_COLON_X = VELI_START + VELI_LBL_W;
    doc.font('R').fontSize(9.5).fillColor(BLACK);
    for (let i = 0; i < veliLabels.length; i++) {
      const ty = veliContentY + veliSpacing * (i + 0.7);
      // Etiket sağa hizalı → ":" hizası sabit
      doc.text(veliLabels[i], VELI_START, ty, { width: VELI_LBL_W, align: 'right', lineBreak: false });
      // ":" sabit konumda
      doc.text(' :', VELI_COLON_X, ty, { width: 12, lineBreak: false });
    }

    curY += sigBoxH + 6;

    // ─────────────────────────────────────────────────────────────────────────
    // 7. FOOTER
    // ─────────────────────────────────────────────────────────────────────────
    const footerText =
      'Bu form 2 (iki) nüsha düzenlenmiş olup bir nüshası veliye teslim edilmiş, bir nüshası öğrenci dosyasında muhafaza edilmektedir.';

    const footerBoxH = 18;
    outerRect(ML, curY, CW, footerBoxH);
    doc.font('I').fontSize(8).fillColor('#444444');
    doc.text(footerText, ML + 6, curY + 4, { width: CW - 12, align: 'center', lineBreak: false });

    // ─────────────────────────────────────────────────────────────────────────
    doc.end();
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}
