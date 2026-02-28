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
  token: string = ''
): string {
  const cleanPhone = parentPhone.replace(/\D/g, '');

  const message = generateMessageTemplate(domain, otp, parentName, token);
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Veli'ye gönderilecek mesaj şablonu
 */
export function generateMessageTemplate(domain: string, otp: string, parentName: string = '', token: string = ''): string {
  const greeting = parentName ? `Sayın ${parentName},` : 'Sayın Veli,';
  const link = token ? `${domain}/veli/${token}` : `${domain}/veli-otp`;
  return `${greeting}

Ogrencinizin devamsizlik bildirimi sisteme yuklenmistir.

Sifre: ${otp}

Asagidaki baglantiya tiklayarak devamsizlik mektubunu goruntuleyebilirsiniz:

${link}

* Sifre 24 saat gecerlidir.`;
}
