/**
 * Yazılı uyarı davranış kodları ve metinleri
 * Ortaöğretim Kurumları Yönetmeliğine uygun kategoriler
 */

export interface WarningBehavior {
  code: string;
  category: string;
  text: string;
  /** Yönetmelik madde referansı */
  article: string;
}

export const WARNING_BEHAVIORS: WarningBehavior[] = [
  // Devamsızlık
  {
    code: 'DEVAMSIZLIK_OZURSUZ',
    category: 'Devamsızlık',
    text: 'Özürsüz devamsızlık yapma',
    article: 'Madde 36',
  },
  {
    code: 'DEVAMSIZLIK_GEC_KALMA',
    category: 'Devamsızlık',
    text: 'Derslere sürekli geç kalma',
    article: 'Madde 164/1-f',
  },
  {
    code: 'DEVAMSIZLIK_OKUL_TERK',
    category: 'Devamsızlık',
    text: 'İzinsiz okul terk etme',
    article: 'Madde 164/1-f',
  },

  // Ders Düzeni
  {
    code: 'DERS_DUZENI_BOZMA',
    category: 'Ders Düzeni',
    text: 'Ders düzenini bozma',
    article: 'Madde 164/1-h',
  },
  {
    code: 'DERS_ARAC_GEREC',
    category: 'Ders Düzeni',
    text: 'Ders araç ve gereçlerini yanında bulundurmama',
    article: 'Madde 164/1-g',
  },
  {
    code: 'DERS_ODEV',
    category: 'Ders Düzeni',
    text: 'Verilen ödev ve sorumlulukları yerine getirmeme',
    article: 'Madde 164/1-b',
  },

  // Kıyafet ve Düzen
  {
    code: 'KIYAFET_UYUMSUZLUK',
    category: 'Kıyafet ve Düzen',
    text: 'Okul kıyafet kurallarına uymama',
    article: 'Madde 164/1-c',
  },
  {
    code: 'KIYAFET_KURALLAR',
    category: 'Kıyafet ve Düzen',
    text: 'Kılık kıyafet kurallarına aykırı davranma',
    article: 'Madde 164/1-c',
  },
  {
    code: 'KISISEL_BAKIM',
    category: 'Kıyafet ve Düzen',
    text: 'Kişisel bakım ve temizlik kurallarına uymama',
    article: 'Madde 164/1-c',
  },

  // Saygı ve Davranış
  {
    code: 'SAYGI_OGRETMEN',
    category: 'Saygı ve Davranış',
    text: 'Öğretmenlere karşı saygısız davranma',
    article: 'Madde 164/1-ğ',
  },
  {
    code: 'SAYGI_OGRENCI',
    category: 'Saygı ve Davranış',
    text: 'Diğer öğrencilere karşı kaba ve saygısız davranma',
    article: 'Madde 164/1-ğ',
  },
  {
    code: 'SAYGI_PERSONEL',
    category: 'Saygı ve Davranış',
    text: 'Okul personeline karşı saygısız davranma',
    article: 'Madde 164/1-ğ',
  },
  {
    code: 'KAVGA',
    category: 'Saygı ve Davranış',
    text: 'Kavga etme veya şiddete başvurma',
    article: 'Madde 164/2-a',
  },

  // Okul Malı
  {
    code: 'OKUL_MALI_ZARAR',
    category: 'Okul Malı',
    text: 'Okul eşya ve malzemelerine zarar verme',
    article: 'Madde 164/1-a',
  },
  {
    code: 'BASKASININ_ESYASI',
    category: 'Okul Malı',
    text: 'Başkasının eşyasına zarar verme veya izinsiz kullanma',
    article: 'Madde 164/1-d',
  },

  // Akademik
  {
    code: 'KOPYA',
    category: 'Akademik',
    text: 'Sınavlarda kopya çekme veya kopya çekmeye teşebbüs etme',
    article: 'Madde 164/1-ı',
  },
  {
    code: 'ODEV_KOPYA',
    category: 'Akademik',
    text: 'Ödev veya projelerde kopya yapma',
    article: 'Madde 164/1-ı',
  },

  // Teknoloji
  {
    code: 'TELEFON_KULLANIM',
    category: 'Teknoloji',
    text: 'Ders sırasında cep telefonu veya elektronik cihaz kullanma',
    article: 'Madde 164/1-n',
  },

  // Genel
  {
    code: 'OKUL_KURALLARI',
    category: 'Genel',
    text: 'Okul iç yönetmelik kurallarına uymama',
    article: 'Madde 164/1',
  },
  {
    code: 'GENEL_KURAL_IHLAL',
    category: 'Genel',
    text: 'Genel kural ihlali',
    article: 'Madde 164/1',
  },
  {
    code: 'SIGARA',
    category: 'Genel',
    text: 'Okul sınırları içinde sigara veya tütün ürünü kullanma',
    article: 'Madde 164/1-ç',
  },
  {
    code: 'DIGER',
    category: 'Genel',
    text: 'Diğer uygunsuz davranışlar',
    article: 'Madde 164/1',
  },
];

/**
 * Yönetmelik maddesine göre ceza kapsamını döndürür
 * Ortaöğretim Kurumları Yönetmeliği Madde 164
 */
export function getSanctionScope(article: string): string {
  if (article.includes('Madde 36')) return 'Devamsızlık Mevzuatı Kapsamı';
  if (article.includes('/1')) return 'Yazılı Uyarı Kapsamı';
  if (article.includes('/2')) return 'Kınama Kapsamı';
  if (article.includes('/3')) return 'Okul Değiştirme Kapsamı';
  if (article.includes('/4')) return 'Okul Değiştirme Kapsamı';
  return 'Yazılı Uyarı Kapsamı';
}

/**
 * Kategorilere göre gruplandırılmış davranışları döndürür
 */
export function getBehaviorsByCategory(): Record<string, WarningBehavior[]> {
  const grouped: Record<string, WarningBehavior[]> = {};
  for (const b of WARNING_BEHAVIORS) {
    if (!grouped[b.category]) {
      grouped[b.category] = [];
    }
    grouped[b.category].push(b);
  }
  return grouped;
}

/**
 * Kod ile davranış bulma
 */
export function findBehaviorByCode(code: string): WarningBehavior | undefined {
  return WARNING_BEHAVIORS.find((b) => b.code === code);
}
