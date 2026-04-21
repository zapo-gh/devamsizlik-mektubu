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

/**
 * Yazılı uyarı davranış kodları ve metinleri
 * Ortaöğretim Kurumları Yönetmeliği Madde 164 — Birebir uygun
 */

export interface WarningBehavior {
  code: string;
  category: string;
  text: string;
  /** Yönetmelik madde referansı */
  article: string;
}

export const WARNING_BEHAVIORS: WarningBehavior[] = [

  // ── DEVAMSIZLIK (Madde 36) ─────────────────────────────────────────────
  {
    code: 'DEVAMSIZLIK_OZURSUZ',
    category: 'Devamsızlık — Madde 36',
    text: 'Özürsüz devamsızlık yapma',
    article: 'Madde 36',
  },

  // ── KINAMA — Madde 164/1 ──────────────────────────────────────────────
  {
    code: 'M164_1_A',
    category: 'Kınama — Madde 164/1',
    text: 'Okulu, okul eşyasını ve çevresini kirletmek',
    article: 'Madde 164/1-a',
  },
  {
    code: 'M164_1_B',
    category: 'Kınama — Madde 164/1',
    text: 'Okul yönetimi veya öğretmenler tarafından verilen eğitim ve öğretime ilişkin görevleri yapmamak',
    article: 'Madde 164/1-b',
  },
  {
    code: 'M164_1_C',
    category: 'Kınama — Madde 164/1',
    text: 'Kılık-kıyafete ilişkin mevzuat hükümlerine uymamak',
    article: 'Madde 164/1-c',
  },
  {
    code: 'M164_1_CC',
    category: 'Kınama — Madde 164/1',
    text: 'Tütün, tütün mamulleri veya tütün içermeyen ancak tütün mamulünü taklit eder tarzda kullanılan her türlü ürünü bulundurmak veya kullanmak',
    article: 'Madde 164/1-ç',
  },
  {
    code: 'M164_1_D',
    category: 'Kınama — Madde 164/1',
    text: 'Başkasına ait eşyayı izinsiz almak veya kullanmak',
    article: 'Madde 164/1-d',
  },
  {
    code: 'M164_1_E',
    category: 'Kınama — Madde 164/1',
    text: 'Yalan söylemek',
    article: 'Madde 164/1-e',
  },
  {
    code: 'M164_1_F',
    category: 'Kınama — Madde 164/1',
    text: 'Okula geldiği hâlde özürsüz eğitim ve öğretim faaliyetlerine, törenlere, sosyal etkinliklere ve okul pansiyonlarında etüde katılmamak, geç katılmak veya bunlardan erken ayrılmak',
    article: 'Madde 164/1-f',
  },
  {
    code: 'M164_1_G',
    category: 'Kınama — Madde 164/1',
    text: 'Okul kütüphanesi, atölye, laboratuvar, pansiyon veya diğer bölümlerden aldığı kitap, araç-gereç ve malzemeyi eksik vermek veya kötü kullanmak',
    article: 'Madde 164/1-g',
  },
  {
    code: 'M164_1_GG',
    category: 'Kınama — Madde 164/1',
    text: 'Okul yöneticilerine, öğretmenlerine, çalışanlarına ve arkadaşlarına kaba ve saygısız davranmak',
    article: 'Madde 164/1-ğ',
  },
  {
    code: 'M164_1_H',
    category: 'Kınama — Madde 164/1',
    text: 'Dersin ve ders dışı eğitim faaliyetlerinin akışını ve düzenini bozacak davranışlarda bulunmak',
    article: 'Madde 164/1-h',
  },
  {
    code: 'M164_1_II',
    category: 'Kınama — Madde 164/1',
    text: 'Kopya çekmek veya çekilmesine yardımcı olmak',
    article: 'Madde 164/1-ı',
  },
  {
    code: 'M164_1_I',
    category: 'Kınama — Madde 164/1',
    text: 'Yatılı okullarda okul yönetimince belirlenen pansiyon kurallarına uymamak',
    article: 'Madde 164/1-i',
  },
  {
    code: 'M164_1_J',
    category: 'Kınama — Madde 164/1',
    text: 'Müstehcen veya yasaklanmış araç, gereç ve dokümanları okula ve okula bağlı yerlere sokmak veya yanında bulundurmak',
    article: 'Madde 164/1-j',
  },
  {
    code: 'M164_1_K',
    category: 'Kınama — Madde 164/1',
    text: 'Kumar oynamaya yarayan araç-gereç ve doküman bulundurmak',
    article: 'Madde 164/1-k',
  },
  {
    code: 'M164_1_L',
    category: 'Kınama — Madde 164/1',
    text: 'Bilişim araçlarını öğretmenler kurulunca belirlenen usul ve esaslara aykırı şekilde kullanmak',
    article: 'Madde 164/1-l',
  },
  {
    code: 'M164_1_M',
    category: 'Kınama — Madde 164/1',
    text: 'Alınan sağlık ve güvenlik tedbirlerine uymamak',
    article: 'Madde 164/1-m',
  },
  {
    code: 'M164_1_N',
    category: 'Kınama — Madde 164/1',
    text: 'Ders saatleri içinde öğretmenin bilgisi ve kontrolü dışında bilişim araçlarını açık tutarak dersin akışını bozmak',
    article: 'Madde 164/1-n',
  },
  {
    code: 'M164_1_O',
    category: 'Kınama — Madde 164/1',
    text: 'Eğitim ortamlarında; dersler arası ile öğle arası dinlenme sürelerinde okul yönetiminin izni dışında bilişim araçlarını yanında bulundurmak ve kullanmak',
    article: 'Madde 164/1-o',
  },
  {
    code: 'M164_1_OO',
    category: 'Kınama — Madde 164/1',
    text: 'Okula, okul yönetiminin izni dışında okulla ilgisi olmayan kişileri getirmek',
    article: 'Madde 164/1-ö',
  },

  // ── OKULDAN KISA SÜRELİ UZAKLAŞTIRMA — Madde 164/2 ──────────────────
  {
    code: 'M164_2_A',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul yöneticilerine, öğretmenlerine, çalışanlarına, öğrencilere ve eğitim ortamlarında bulunan diğer kişilere sözle, davranışla veya sosyal medya üzerinden hakaret etmek, hakareti paylaşmak, başkalarını bu davranışa kışkırtmak, bu kişileri tehdit etmek',
    article: 'Madde 164/2-a',
  },
  {
    code: 'M164_2_B',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Pansiyonun düzenini bozmak, pansiyonu terk etmek, gece izinsiz dışarıda kalmak',
    article: 'Madde 164/2-b',
  },
  {
    code: 'M164_2_C',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Kişileri veya grupları dil, ırk, cinsiyet, siyasi düşünce, felsefi ve dini inançlarına göre ayırmayı, kınamayı, kötülemeyi amaçlayan davranışlarda bulunmak veya ayrımcılığı körükleyici semboller taşımak',
    article: 'Madde 164/2-c',
  },
  {
    code: 'M164_2_CC',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul binası ve eklentilerinde izinsiz gösteri, etkinlik ve toplantı düzenlemek, bu tür gösteri, etkinlik ve toplantılara katılmak',
    article: 'Madde 164/2-ç',
  },
  {
    code: 'M164_2_D',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Her türlü ortamda kumar oynamak veya oynatmak',
    article: 'Madde 164/2-d',
  },
  {
    code: 'M164_2_E',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul kurallarının uygulanmasını ve öğrencilere verilen görevlerin yapılmasını engellemek',
    article: 'Madde 164/2-e',
  },
  {
    code: 'M164_2_G',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Siyasi, ideolojik, müstehcen veya yasaklanmış araç, gereç, doküman ve benzerlerini paylaşmak, dağıtmak, duvarlara ve diğer yerlere asmak, yazmak; bu amaçlar için bilişim araçlarını, okul araç-gerecini ve eklentilerini kullanmak',
    article: 'Madde 164/2-g',
  },
  {
    code: 'M164_2_GG',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Bilişim araçları veya sosyal medya yoluyla eğitim ve öğretim faaliyetlerine, kişilere ve kurumlara zarar vermek',
    article: 'Madde 164/2-ğ',
  },
  {
    code: 'M164_2_H',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okula geldiği hâlde özürsüz eğitim ve öğretim faaliyetlerine, törenlere ve diğer sosyal etkinliklere katılmamayı, geç katılmayı veya erken ayrılmayı alışkanlık hâline getirmek',
    article: 'Madde 164/2-h',
  },
  {
    code: 'M164_2_II',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Kavga etmek, başkalarına fiili şiddet uygulamak',
    article: 'Madde 164/2-ı',
  },
  {
    code: 'M164_2_I',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul binası, eklenti ve donanımlarına, arkadaşlarının araç-gerecine siyasi, ideolojik veya müstehcen amaçlı yazılar yazmak, resim veya semboller çizmek',
    article: 'Madde 164/2-i',
  },
  {
    code: 'M164_2_J',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Toplu kopya çekmek veya çekilmesine yardımcı olmak',
    article: 'Madde 164/2-j',
  },
  {
    code: 'M164_2_K',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Sarhoşluk veren zararlı maddeleri bulundurmak veya kullanmak',
    article: 'Madde 164/2-k',
  },
  {
    code: 'M164_2_L',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Millî ve manevî değerlere, genel ahlak ve adaba uygun olmayan tutum ve davranışlarda bulunmak',
    article: 'Madde 164/2-l',
  },
  {
    code: 'M164_2_M',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul personelinin taşınır veya taşınmaz malına zarar vermek ve/veya malını tahrip etmek',
    article: 'Madde 164/2-m',
  },
  {
    code: 'M164_2_N',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul yöneticilerinin, öğretmenlerinin, çalışanlarının ve diğer öğrencilerin izinsiz olarak görüntülerini çekmek, kaydetmek, paylaşmak',
    article: 'Madde 164/2-n',
  },
  {
    code: 'M164_2_O',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Okul, pansiyon ve eklentilerini belirlenen kurallar dışında kullanmak, pansiyonda izinsiz kalmak',
    article: 'Madde 164/2-o',
  },
  {
    code: 'M164_2_OO',
    category: 'Okuldan Kısa Süreli Uzaklaştırma — Madde 164/2',
    text: 'Tekrarlayan çeşitli davranışlarıyla başka bir öğrencinin sosyal veya duygusal gelişimini olumsuz yönde etkileyecek şekilde akran zorbalığı yapmak',
    article: 'Madde 164/2-ö',
  },

  // ── OKUL DEĞİŞTİRME — Madde 164/3 ───────────────────────────────────
  {
    code: 'M164_3_A',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Türk Bayrağına, ülkeyi, milleti ve devleti temsil eden sembollere saygısızlık etmek',
    article: 'Madde 164/3-a',
  },
  {
    code: 'M164_3_B',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Millî ve manevî değerleri söz, yazı, resim veya başka bir şekilde aşağılamak; bu değerlere küfür ve hakaret etmek',
    article: 'Madde 164/3-b',
  },
  {
    code: 'M164_3_C',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Okul çalışanlarının görevlerini yapmalarına engel olmak',
    article: 'Madde 164/3-c',
  },
  {
    code: 'M164_3_CC',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Hırsızlık yapmak, yaptırmak ve yapılmasına yardımcı olmak',
    article: 'Madde 164/3-ç',
  },
  {
    code: 'M164_3_D',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Okulla ilişkisi olmayan kişileri, okulda veya eklentilerinde barındırmak',
    article: 'Madde 164/3-d',
  },
  {
    code: 'M164_3_E',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Resmî belgelerde değişiklik yapmak; sahte belge düzenlemek ve kullanmak ve başkalarını yararlandırmak',
    article: 'Madde 164/3-e',
  },
  {
    code: 'M164_3_F',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Okul sınırları içinde herhangi bir yeri, izinsiz olarak eğitim ve öğretim amaçları dışında kullanmak veya kullanılmasına yardımcı olmak',
    article: 'Madde 164/3-f',
  },
  {
    code: 'M164_3_G',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Okula ait taşınır veya taşınmaz mallara zarar vermek',
    article: 'Madde 164/3-g',
  },
  {
    code: 'M164_3_GG',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Ders, sınav, uygulama ve diğer faaliyetlerin yapılmasını engellemek veya arkadaşlarını bu eylemlere katılmaya kışkırtmak',
    article: 'Madde 164/3-ğ',
  },
  {
    code: 'M164_3_H',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Eğitim ve öğretim ortamına yaralayıcı, öldürücü silah ve patlayıcı madde ile her türlü aletleri getirmek veya bunları bulundurmak',
    article: 'Madde 164/3-h',
  },
  {
    code: 'M164_3_II',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Zor kullanarak veya tehditle kopya çekmek veya çekilmesini sağlamak',
    article: 'Madde 164/3-ı',
  },
  {
    code: 'M164_3_I',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Bağımlılık yapan zararlı maddeleri bulundurmak veya kullanmak',
    article: 'Madde 164/3-i',
  },
  {
    code: 'M164_3_J',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Yerine başkasını sınava sokmak, başkasının yerine sınava girmek',
    article: 'Madde 164/3-j',
  },
  {
    code: 'M164_3_K',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Eğitim ve öğretim ortamında; siyasi ve ideolojik amaçlı eylem düzenlemek, başkalarını bu gibi eylemler düzenlemeye kışkırtmak, düzenlenmiş eylemlere katılmak',
    article: 'Madde 164/3-k',
  },
  {
    code: 'M164_3_L',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Siyasi partilere, bu partilere bağlı yan kuruluşlara, derneklere, sendikalara ve benzeri kuruluşlara üye olmak, üye kaydetmek, para toplamak ve bağışta bulunmaya zorlamak',
    article: 'Madde 164/3-l',
  },
  {
    code: 'M164_3_M',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Bilişim araçları veya sosyal medya yoluyla eğitim ve öğretimi engellemek, kişilere ağır derecede maddi ve manevi zarar vermek',
    article: 'Madde 164/3-m',
  },
  {
    code: 'M164_3_N',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'İzin almadan okulla ilgili; bilgi vermek, basın toplantısı yapmak, bildiri yayınlamak ve dağıtmak, faaliyet tertip etmek veya bu kapsamdaki faaliyetlerde etkin rol almak',
    article: 'Madde 164/3-n',
  },
  {
    code: 'M164_3_O',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Bir kimseyi ya da grubu suç sayılan bir eylemi yapmaya, böyle eylemlere katılmaya, yalan bildirimde bulunmaya veya suçu yüklenmeye zorlamak',
    article: 'Madde 164/3-o',
  },
  {
    code: 'M164_3_OO',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Zor kullanarak başkasına ait mal ve eşyaya el koymak, başkalarını bu işleri yapmaya zorlamak',
    article: 'Madde 164/3-ö',
  },
  {
    code: 'M164_3_P',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Genel ahlak ve adaba uygun olmayan tutum ve davranışları alışkanlık hâline getirmek',
    article: 'Madde 164/3-p',
  },
  {
    code: 'M164_3_R',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Kişilere, arkadaşlarına ve okul çalışanlarına; söz ve davranışlarla sarkıntılık yapmak, iftira etmek, başkalarını bu davranışlara kışkırtmak veya zorlamak, yapılan bu fiilleri sosyal medya yoluyla paylaşmak, yaymak',
    article: 'Madde 164/3-r',
  },
  {
    code: 'M164_3_S',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Pansiyon düzenini bozmayi, pansiyonu terk etmeyi ve gece izinsiz dışarıda kalmayı alışkanlık hâline getirmek',
    article: 'Madde 164/3-s',
  },
  {
    code: 'M164_3_SS',
    category: 'Okul Değiştirme — Madde 164/3',
    text: 'Kesici, delici, yaralayıcı ve benzeri aletlerle kendine zarar vermek',
    article: 'Madde 164/3-ş',
  },

  // ── ÖRGÜN EĞİTİM DIŞINA ÇIKARMA — Madde 164/4 ───────────────────────
  {
    code: 'M164_4_A',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Türk Bayrağına, ülkeyi, milleti ve devleti temsil eden sembollere hakaret etmek',
    article: 'Madde 164/4-a',
  },
  {
    code: 'M164_4_B',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Türkiye Cumhuriyetinin devleti ve milletiyle bölünmez bütünlüğü ilkesine aykırı miting, forum, direniş, yürüyüş, boykot ve işgal gibi ferdi veya toplu eylemler düzenlemek; düzenlenmesini kışkırtmak ve düzenlenmiş bu gibi eylemlere etkin olarak katılmak veya katılmaya zorlamak',
    article: 'Madde 164/4-b',
  },
  {
    code: 'M164_4_C',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Kişileri veya grupları; dil, ırk, cinsiyet, siyasi düşünce, felsefi ve dini inançlarına göre ayırmayı, kınamayı, kötülemeyi amaçlayan bölücü ve yıkıcı toplu eylemler düzenlemek, katılmak, bu eylemlerin organizasyonunda yer almak',
    article: 'Madde 164/4-c',
  },
  {
    code: 'M164_4_CC',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Kurul ve komisyonların çalışmasını tehdit veya zor kullanarak engellemek',
    article: 'Madde 164/4-ç',
  },
  {
    code: 'M164_4_D',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Bağımlılık yapan zararlı maddelerin ticaretini yapmak',
    article: 'Madde 164/4-d',
  },
  {
    code: 'M164_4_E',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Okul ve eklentilerinde güvenlik güçlerince aranan kişileri saklamak ve barındırmak',
    article: 'Madde 164/4-e',
  },
  {
    code: 'M164_4_F',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Eğitim ve öğretim ortamını işgal etmek',
    article: 'Madde 164/4-f',
  },
  {
    code: 'M164_4_G',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Okul içinde ve dışında tek veya toplu hâlde okulun yönetici, öğretmen, eğitici personel, memur ve diğer personeline karşı saldırıda bulunmak, bu gibi hareketleri düzenlemek veya kışkırtmak',
    article: 'Madde 164/4-g',
  },
  {
    code: 'M164_4_GG',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Okul çalışanlarının görevlerini yapmalarına engel olmak için fiili saldırıda bulunmak ve başkalarını bu yöndeki eylemlere kışkırtmak',
    article: 'Madde 164/4-ğ',
  },
  {
    code: 'M164_4_H',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Okulun taşınır veya taşınmaz mallarını kasıtlı olarak tahrip etmek',
    article: 'Madde 164/4-h',
  },
  {
    code: 'M164_4_II',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Yaralayıcı, öldürücü her türlü alet, silah, patlayıcı maddeler veya fiziki güç kullanmak suretiyle bir kimseyi yaralamaya teşebbüs etmek, yaralamak, öldürmek, maddi veya manevi zarara yol açmak',
    article: 'Madde 164/4-ı',
  },
  {
    code: 'M164_4_I',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Kişi veya kişilere her ne sebeple olursa olsun eziyet etmek; işkence yapmak veya yaptırmak, cinsel istismar ve bu konuda kanunların suç saydığı fiilleri işlemek',
    article: 'Madde 164/4-i',
  },
  {
    code: 'M164_4_J',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Çete kurmak, çetede yer almak, yol kesmek, adam kaçırmak; kapkaç ve gasp yapmak, fidye ve haraç almak',
    article: 'Madde 164/4-j',
  },
  {
    code: 'M164_4_K',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Yasa dışı örgütlerin ve kuruluşların siyasi ve ideolojik görüşleri doğrultusunda propaganda yapmak, eylem düzenlemek, başkalarını bu gibi eylemleri düzenlemeye kışkırtmak, düzenlenmiş eylemlere etkin biçimde katılmak, bu kuruluşlara üye olmak, üye kaydetmek, para toplamak ve bağışta bulunmaya zorlamak',
    article: 'Madde 164/4-k',
  },
  {
    code: 'M164_4_L',
    category: 'Örgün Eğitim Dışına Çıkarma — Madde 164/4',
    text: 'Bilişim araçları veya sosyal medya yoluyla; bölücü, yıkıcı, ahlak dışı ve şiddeti özendiren sesli, sözlü, yazılı ve görüntülü içerikler oluşturmak, bunları çoğaltmak, yaymak ve ticaretini yapmak',
    article: 'Madde 164/4-l',
  },
];

/**
 * Yönetmelik maddesine göre ceza kapsamını döndürür
 * Ortaöğretim Kurumları Yönetmeliği Madde 164
 */
export function getSanctionScope(article: string): string {
  if (article.includes('Madde 36')) return 'Devamsızlık Mevzuatı Kapsamı';
  if (article.includes('/4')) return 'Örgün Eğitim Dışına Çıkarma Kapsamı';
  if (article.includes('/3')) return 'Okul Değiştirme Kapsamı';
  if (article.includes('/2')) return 'Okuldan Kısa Süreli Uzaklaştırma Kapsamı';
  if (article.includes('/1')) return 'Kınama Kapsamı';
  return 'Kınama Kapsamı';
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
