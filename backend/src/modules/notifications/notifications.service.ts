/**
 * WhatsApp link ve mesaj şablonu oluşturma servisi.
 * WhatsApp API kullanılmaz - admin mesajı WhatsApp Web üzerinden manuel gönderir.
 */

/**
 * WhatsApp Web üzerinden mesaj göndermek için URL oluşturur.
 *
 * @param parentPhone - Veli telefon numarası (ör: 905551234567)
 * @param domain - Frontend domain (ör: https://yourdomain.com)
 * @param otp - Tek kullanımlık şifre
 * @returns WhatsApp Web URL'i
 */
export function generateWhatsAppLink(
  parentPhone: string,
  domain: string,
  otp: string,
  parentName: string = '',
  token: string = '',
  expiryMinutes: number = 1440
): string {
  let cleanPhone = parentPhone.replace(/\D/g, '');
  // Türk numaraları için: 0 ile başlıyorsa 90 ile değiştir
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '90' + cleanPhone.slice(1);
  }
  // Ülke kodu yoksa ekle
  if (!cleanPhone.startsWith('90') && cleanPhone.length === 10) {
    cleanPhone = '90' + cleanPhone;
  }

  const message = generateMessageTemplate(domain, otp, parentName, token, expiryMinutes);
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Veli'ye gönderilecek mesaj şablonu
 */
export function generateMessageTemplate(domain: string, otp: string, parentName: string = '', token: string = '', expiryMinutes: number = 1440): string {
  const greeting = parentName ? `Sayın ${parentName},` : 'Sayın Veli,';
  const link = token ? `${domain}/veli/${token}` : `${domain}/veli-otp`;
  const expiryText = expiryMinutes >= 1440 ? `${Math.round(expiryMinutes / 1440)} gün` : expiryMinutes >= 60 ? `${Math.round(expiryMinutes / 60)} saat` : `${expiryMinutes} dakika`;
  return `${greeting}

Ogrencinizin devamsizlik bildirimi sisteme yuklenmistir.

Sifre: ${otp}

Asagidaki baglantiya tiklayarak devamsizlik mektubunu goruntuleyebilirsiniz:

${link}

* Sifre ${expiryText} gecerlidir.`;
}
