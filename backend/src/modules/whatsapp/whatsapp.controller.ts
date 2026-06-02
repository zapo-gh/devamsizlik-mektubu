import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import sharp from 'sharp';
import { whatsappService } from './whatsapp.service';
import { absenteeismService } from '../absenteeism/absenteeism.service';
import { getFullPageBuffer } from '../absenteeism/pdfPreview.service';
import { warningsService } from '../warnings/warnings.service';
import { normalizePhone } from '../notifications/notifications.service';
import { settingsService } from '../settings/settings.service';
import prisma from '../shared/utils/prisma';

// ── Devamsızlık mesaj şablonları (varsayılan) ─────────────────────────────────
// Kullanıcı Settings sayfasından kendi şablonunu girebilir.
// Yer tutucular: {{ogrenciAdi}} {{ozurluGun}} {{ozursuzGun}} {{toplamGun}} {{okulAdi}} {{uyariNo}}

const DEFAULT_WA_TEMPLATES: Record<number, string> = {
  1: `*Devamsızlık Mektubu – {{uyariNo}}. Uyarı*

Sayın Velimiz,

Okulumuz öğrencisi *{{ogrenciAdi}}*'nın devamsızlığı; *{{ozurluGun}} gün özürlü, {{ozursuzGun}} gün özürsüz* olmak üzere *toplam {{toplamGun}} gündür.*

Öğrencinizin okula devamının sağlanması hususunda gereğini önemle rica ederiz.

Bu mesaj, devamsızlık mektubu ve yasal bildirim niteliğinde olup, ilgili yönetmelik gereği tarafınıza gönderilmiştir.

{{okulAdi}}`,

  2: `*Devamsızlık Mektubu – {{uyariNo}}. Uyarı*

Sayın Velimiz,

Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliğine göre; özürsüz devamsızlığı 10 günü, toplam devamsızlığı 30 günü aşan öğrenciler, ders puanlarına bakılmaksızın başarısız sayılmaktadır.

Okulumuz öğrencisi *{{ogrenciAdi}}*'nın devamsızlığı; *{{ozurluGun}} gün özürlü, {{ozursuzGun}} gün özürsüz* olmak üzere *toplam {{toplamGun}} gündür.*

*Toplam devamsızlığı 30 günü aşan öğrenciler, ders puanları ne olursa olsun başarısız sayılmakta ve sınıf tekrarına kalmaktadır.* Öğrencinin daha önce sınıf tekrarı yapmış olması hâlinde ise örgün eğitim hakkı sona ermekte ve öğrenci örgün eğitim dışına çıkarılmaktadır.

*Öğrencinizin okula devamının sağlanması hususunda gereğini önemle rica ederiz.*

Bu mesaj, devamsızlık mektubu ve yasal bildirim niteliğinde olup, ilgili yönetmelik gereği tarafınıza gönderilmiştir.

{{okulAdi}}`,

  3: `*Devamsızlık Mektubu – {{uyariNo}}. Uyarı*

Sayın Velimiz,

Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliğine göre; özürsüz devamsızlığı 10 günü, toplam devamsızlığı 30 günü aşan öğrenciler, ders puanlarına bakılmaksızın başarısız sayılmaktadır.

Okulumuz öğrencisi *{{ogrenciAdi}}*'nın devamsızlığı; *{{ozurluGun}} gün özürlü, {{ozursuzGun}} gün özürsüz* olmak üzere *toplam {{toplamGun}} gündür.*

*Toplam devamsızlığı 30 günü aşan öğrenciler, ders puanları ne olursa olsun başarısız sayılmakta ve sınıf tekrarına kalmaktadır.* Öğrencinin daha önce sınıf tekrarı yapmış olması hâlinde ise örgün eğitim hakkı sona ermekte ve öğrenci örgün eğitim dışına çıkarılmaktadır.

Öğrencinizin okula devamının sağlanması hususunda gereğini önemle rica ederiz.

*Konuyla ilgili detaylı bilgi için ilgili müdür yardımcısı ile görüşmeniz gerekmektedir.*

Bu mesaj, devamsızlık mektubu ve yasal bildirim niteliğinde olup, ilgili yönetmelik gereği tarafınıza gönderilmiştir.

{{okulAdi}}`,
};

// BEP (Bireysel Eğitim Planı) öğrencileri için şablon — tüm uyarı seviyeleri için aynı
const BEP_WA_TEMPLATE = `*Devamsızlık Mektubu – {{uyariNo}}. Uyarı*

Sayın Velimiz,

Milli Eğitim Bakanlığı Ortaöğretim Kurumları Yönetmeliği'ne göre; tam zamanlı kaynaştırma/bütünleştirme (BEP) yoluyla eğitim alan öğrenciler için özürsüz devamsızlık sınırı 20 gün, toplam devamsızlık sınırı ise 70 gündür.

Öğrenciniz *{{ogrenciAdi}}*'nın devamsızlığı; *{{ozurluGun}} gün özürlü, {{ozursuzGun}} gün özürsüz* olmak üzere *toplam {{toplamGun}} gündür.*

*Özürsüz devamsızlığı 20 günü veya toplam devamsızlığı 70 günü aşan BEP kapsamındaki öğrenciler, ders puanlarına bakılmaksızın başarısız sayılmakta ve sınıf tekrarına kalmaktadır.*

Öğrencinizin okula devamının sağlanması hususunda gereğini rica ederiz.

{{okulAdi}}`;

function formatDay(val: number | null | undefined): string {
  if (val == null) return '?';
  return val % 1 === 0 ? String(val) : val.toFixed(1).replace('.', ',');
}

function buildAbsenteeismMessage(opts: {
  template: string;
  studentName: string;
  warningNumber: number;
  excusedDays: number | null;
  unexcusedDays: number | null;
  schoolName: string;
}): string {
  const { template, studentName, warningNumber, excusedDays, unexcusedDays, schoolName } = opts;
  const total = (excusedDays ?? 0) + (unexcusedDays ?? 0);

  return template
    .replace(/\{\{ogrenciAdi\}\}/g, studentName)
    .replace(/\{\{ozurluGun\}\}/g, formatDay(excusedDays))
    .replace(/\{\{ozursuzGun\}\}/g, formatDay(unexcusedDays))
    .replace(/\{\{toplamGun\}\}/g, formatDay(total || null))
    .replace(/\{\{okulAdi\}\}/g, schoolName)
    .replace(/\{\{uyariNo\}\}/g, String(warningNumber))
    .trim();
}

export const whatsappController = {
  /** GET /api/whatsapp/status */
  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const st = whatsappService.getStatus();
      res.json({ success: true, data: st });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/connect */
  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      await whatsappService.initialize();
      res.json({ success: true, message: 'Bağlantı başlatıldı.' });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/disconnect */
  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      await whatsappService.disconnect();
      res.json({ success: true, message: 'Bağlantı kesildi ve oturum silindi.' });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/send/absenteeism/:id
   *  Devamsızlık kaydını PDF + mesaj olarak tüm velilere gönderir
   */
  async sendAbsenteeism(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await absenteeismService.getById(req.params.id);
      const parents = record.student.parents as { fullName: string; phone: string }[];

      if (!parents || parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      // Seçili velileri filtrele (frontend'den gelen selectedPhones dizisi)
      const selectedPhones: string[] | undefined = req.body.selectedPhones;
      const filteredParents = (selectedPhones && selectedPhones.length > 0)
        ? parents.filter(p => selectedPhones.includes(p.phone))
        : parents;

      if (filteredParents.length === 0) {
        res.status(400).json({ success: false, message: 'Gönderilecek veli seçilmedi.' });
        return;
      }

      const pdfPath = await absenteeismService.servePdf(req.params.id);
      const studentName = record.student.fullName;
      const className = record.student.className;

      // Önizleme JPG varsa görsel olarak gönder (WhatsApp'ta inline görünür)
      // Yoksa PDF dosyasını belge olarak gönder (fallback)
      const previewPath: string | null = (record as any).previewPath ?? null;
      const useImage = !!previewPath && fs.existsSync(previewPath);

      // Kullanıcı tarafından seçilen kırpma alanı (0–100 arası yüzde değerleri)
      const cropTopRaw = req.body.cropTop;
      const cropBottomRaw = req.body.cropBottom;
      const cropTop = cropTopRaw !== undefined && cropTopRaw !== null ? parseFloat(String(cropTopRaw)) : undefined;
      const cropBottom = cropBottomRaw !== undefined && cropBottomRaw !== null ? parseFloat(String(cropBottomRaw)) : undefined;
      const hasCustomCrop = useImage && cropTop !== undefined && cropBottom !== undefined
        && !isNaN(cropTop) && !isNaN(cropBottom) && cropBottom > cropTop;

      // Şablonu settings'ten al, yoksa varsayılanı kullan; BEP öğrencileri için BEP şablonu
      const settings = await settingsService.get();
      const warningNo = record.warningNumber;
      const isBep = !!(record as any).isBep;
      const templateKey = `waTemplate${Math.min(warningNo, 3)}` as 'waTemplate1' | 'waTemplate2' | 'waTemplate3';
      const templateText = isBep
        ? BEP_WA_TEMPLATE
        : (settings[templateKey] && (settings[templateKey] as string).trim())
          ? settings[templateKey] as string
          : DEFAULT_WA_TEMPLATES[Math.min(warningNo, 3)] ?? DEFAULT_WA_TEMPLATES[2];

      const excusedDays: number | null = (() => {
        const v = req.body.excusedDays;
        return (v !== undefined && v !== '' && v !== null) ? parseFloat(String(v)) : ((record as any).excusedDays ?? null);
      })();
      const unexcusedDays: number | null = (() => {
        const v = req.body.unexcusedDays;
        return (v !== undefined && v !== '' && v !== null) ? parseFloat(String(v)) : ((record as any).unexcusedDays ?? null);
      })();

      const results: { parent: string; phone: string; ok: boolean; error?: string }[] = [];

      for (const parent of filteredParents) {
        const msg = buildAbsenteeismMessage({
          template: templateText,
          studentName,
          warningNumber: warningNo,
          excusedDays,
          unexcusedDays,
          schoolName: settings.schoolName || 'Okul Yönetimi',
        });

        try {
          if (useImage) {
            if (hasCustomCrop) {
              // Kullanıcının seçtiği bölgeyi PDF'den yeniden kırp ve buffer olarak gönder
              const pageBuf = await getFullPageBuffer(pdfPath);
              const meta = await sharp(pageBuf).metadata();
              const imgH = meta.height!;
              const imgW = meta.width!;
              const topPx = Math.max(0, Math.floor(imgH * cropTop! / 100));
              const heightPx = Math.max(1, Math.floor(imgH * (cropBottom! - cropTop!) / 100));
              const cropBuf = await sharp(pageBuf)
                .extract({ left: 0, top: topPx, width: imgW, height: heightPx })
                .jpeg({ quality: 100 })
                .toBuffer();
              await whatsappService.sendMessageWithImageBuffer(parent.phone, msg, cropBuf);
            } else {
              await whatsappService.sendMessageWithImage(parent.phone, msg, previewPath!);
            }
          } else {
            const fileName = `devamsizlik_${studentName.replace(/\s/g, '_')}.pdf`;
            await whatsappService.sendMessageWithPDF(parent.phone, msg, pdfPath, fileName);
          }
          results.push({ parent: parent.fullName, phone: parent.phone, ok: true });
        } catch (err: any) {
          results.push({ parent: parent.fullName, phone: parent.phone, ok: false, error: err.message });
        }
      }

      // En az bir gönderim başarılıysa waSentAt güncelle
      if (results.some(r => r.ok)) {
        await prisma.absenteeism.update({
          where: { id: req.params.id },
          data: { waSentAt: new Date() },
        });
      }

      res.json({ success: true, data: { results } });
    } catch (err) { next(err); }
  },

  /** GET /api/whatsapp/full-image/absenteeism/:id
   *  PDF'nin ilk sayfasını kırpmasız, tam boyutlu JPEG olarak base64 döndürür.
   *  Kullanıcının kırpma alanını seçebilmesi için frontend'de gösterilir.
   */
  async fullImageAbsenteeism(req: Request, res: Response, next: NextFunction) {
    try {
      const pdfPath = await absenteeismService.servePdf(req.params.id);
      const pageBuf = await getFullPageBuffer(pdfPath);
      const jpegBuf = await sharp(pageBuf).jpeg({ quality: 90 }).toBuffer();
      res.json({ success: true, data: { image: jpegBuf.toString('base64') } });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/preview/absenteeism/:id
   *  Mesaj önizlemesi döndürür (gönderim yapmaz)
   */
  async previewAbsenteeism(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await absenteeismService.getById(req.params.id);
      const parents = record.student.parents as { fullName: string; phone: string }[];

      if (!parents || parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      const settings = await settingsService.get();
      const warningNo = record.warningNumber;
      const isBep = !!(record as any).isBep;
      const templateKey = `waTemplate${Math.min(warningNo, 3)}` as 'waTemplate1' | 'waTemplate2' | 'waTemplate3';
      const templateText = isBep
        ? BEP_WA_TEMPLATE
        : (settings[templateKey] && (settings[templateKey] as string).trim())
          ? settings[templateKey] as string
          : DEFAULT_WA_TEMPLATES[Math.min(warningNo, 3)] ?? DEFAULT_WA_TEMPLATES[2];

      const excusedDays: number | null = (() => {
        const v = req.body.excusedDays;
        return (v !== undefined && v !== '' && v !== null) ? parseFloat(String(v)) : ((record as any).excusedDays ?? null);
      })();
      const unexcusedDays: number | null = (() => {
        const v = req.body.unexcusedDays;
        return (v !== undefined && v !== '' && v !== null) ? parseFloat(String(v)) : ((record as any).unexcusedDays ?? null);
      })();

      const previewPath: string | null = (record as any).previewPath ?? null;
      const hasPreviewImage = !!previewPath && require('fs').existsSync(previewPath);

      const messages = parents.map(parent => ({
        parent: parent.fullName,
        phone: parent.phone,
        message: buildAbsenteeismMessage({
          template: templateText,
          studentName: record.student.fullName,
          warningNumber: warningNo,
          excusedDays,
          unexcusedDays,
          schoolName: settings.schoolName || 'Okul Yönetimi',
        }),
      }));

      res.json({
        success: true,
        data: {
          studentName: record.student.fullName,
          className: record.student.className,
          warningNumber: warningNo,
          excusedDays,
          unexcusedDays,
          hasPreviewImage,
          messages,
        },
      });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/send/warning/:id
   *  Yazılı uyarı PDF + mesajı tüm velilere gönderir
   */
  async sendWarning(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await prisma.writtenWarning.findUnique({
        where: { id: req.params.id },
        include: {
          student: {
            include: {
              parents: { select: { fullName: true, phone: true } },
            },
          },
        },
      });

      if (!record) {
        res.status(404).json({ success: false, message: 'Yazılı uyarı kaydı bulunamadı.' });
        return;
      }

      const parents = record.student.parents;
      if (!parents || parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      // Seçili velileri filtrele (frontend'den gelen selectedPhones dizisi)
      const selectedPhones: string[] | undefined = req.body.selectedPhones;
      const filteredParents = (selectedPhones && selectedPhones.length > 0)
        ? parents.filter(p => selectedPhones.includes(p.phone))
        : parents;

      if (filteredParents.length === 0) {
        res.status(400).json({ success: false, message: 'Gönderilecek veli seçilmedi.' });
        return;
      }

      const results: { parent: string; phone: string; ok: boolean; error?: string }[] = [];

      for (const parent of filteredParents) {
        const greeting = parent.fullName ? `Sayın ${parent.fullName},` : 'Sayın Veli,';
        const msg =
          `${greeting}\n\n` +
          `Öğrenciniz ${record.student.fullName} (${record.student.className} sınıfı, ` +
          `No: ${record.student.schoolNumber}) ${record.warningNumber}. yazılı uyarı almıştır.\n\n` +
          `Davranış: ${record.behaviorText}\n` +
          (record.description ? `Açıklama: ${record.description}\n` : '') +
          `\nSaygılarımızla,\nOkul Yönetimi`;

        try {
          await whatsappService.sendTextMessage(parent.phone, msg);
          results.push({ parent: parent.fullName, phone: parent.phone, ok: true });
        } catch (err: any) {
          results.push({ parent: parent.fullName, phone: parent.phone, ok: false, error: err.message });
        }
      }

      // En az bir gönderim başarılıysa waSentAt güncelle
      if (results.some(r => r.ok)) {
        await prisma.writtenWarning.update({
          where: { id: req.params.id },
          data: { waSentAt: new Date() },
        });
      }

      res.json({ success: true, data: { results } });
    } catch (err) { next(err); }
  },

  /** POST /api/whatsapp/preview/warning/:id
   *  Yazılı uyarı mesaj önizlemesi döndürür (gönderim yapmaz)
   */
  async previewWarning(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await prisma.writtenWarning.findUnique({
        where: { id: req.params.id },
        include: {
          student: {
            include: {
              parents: { select: { fullName: true, phone: true } },
            },
          },
        },
      });

      if (!record) {
        res.status(404).json({ success: false, message: 'Yazılı uyarı kaydı bulunamadı.' });
        return;
      }

      const parents = record.student.parents;
      if (!parents || parents.length === 0) {
        res.status(400).json({ success: false, message: 'Bu öğrenciye tanımlı veli bulunamadı.' });
        return;
      }

      const messages = parents.map(parent => {
        const greeting = parent.fullName ? `Sayın ${parent.fullName},` : 'Sayın Veli,';
        const msg =
          `${greeting}\n\n` +
          `Öğrenciniz ${record.student.fullName} (${record.student.className} sınıfı, ` +
          `No: ${record.student.schoolNumber}) ${record.warningNumber}. yazılı uyarı almıştır.\n\n` +
          `Davranış: ${record.behaviorText}\n` +
          (record.description ? `Açıklama: ${record.description}\n` : '') +
          `\nSaygılarımızla,\nOkul Yönetimi`;

        return { parent: parent.fullName, phone: parent.phone, message: msg };
      });

      res.json({
        success: true,
        data: {
          studentName: record.student.fullName,
          className: record.student.className,
          warningNumber: record.warningNumber,
          messages,
        },
      });
    } catch (err) { next(err); }
  },
};
