/**
 * Türk telefon numarasını wa.me formatına normalize eder.
 * Örn: 05551234567 → 905551234567
 */
export function normalizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  // 00 ile başlayan uluslararası prefix'i temizle
  if (clean.startsWith('00')) clean = clean.slice(2);
  // 0 ile başlıyorsa 90 ile değiştir
  if (clean.startsWith('0')) clean = '90' + clean.slice(1);
  // Ülke kodu yoksa ekle (10 haneli Türk numarası)
  if (!clean.startsWith('90') && clean.length === 10) clean = '90' + clean;
  return clean;
}
