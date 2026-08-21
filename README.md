# OkulDesk

Okul yönetimi için geliştirilmiş masaüstü uygulaması. Devamsızlık takibi, yazılı uyarı yönetimi, kıyafet/tören ihlali kaydı, karne bazlı akademik başarısızlık bildirimi ve WhatsApp üzerinden veli bilgilendirmesi tek çatı altında sunar.

## Genel Bakış

OkulDesk, **Tauri v2** tabanlı, modern bir masaüstü uygulamasıdır. İnternete ihtiyaç duymaz. Tüm veriler yerel SQLite veritabanında saklanır.

```
Tauri v2 (Native Masaüstü Kabuğu — Rust)
  ├── Node.js Sidecar (Express.js backend, port 4000)
  │     └── SQLite (Prisma ORM 5)
  └── React 18 + Vite 5 (Frontend)
```

## Özellikler

### Öğrenci Yönetimi
- Öğrenci ekleme, düzenleme, pasife alma
- Veli bilgisi (ad, telefon) tanımlama — öğrenci başına birden fazla veli
- Excel ile toplu içe aktarma (öğrenci + veli)
- Sınıf bazlı listeleme ve filtreleme

### Devamsızlık Takibi
- PDF/JPG/PNG formatında devamsızlık mektubu yükleme
- Otomatik PDF önizleme üretme (MuPDF)
- Mazeretli / mazaretsiz gün girişi, BEP öğrenci işareti
- Her öğrenci için 1–5 arası otomatik uyarı numarası sıralaması
- WhatsApp ile veliye bildirim
- Gönderildi / Gönderilmedi istatistiği

### Yazılı Uyarı Yönetimi
- Davranış kodu ve metni seçerek uyarı kaydı oluşturma
- Rehber öğretmen notu, sınıf rehber öğretmeni ve okul danışmanı alanları
- PDFKit ile otomatik yazılı uyarı belgesi üretimi
- İndir / Görüntüle; dosya adında öğrenci adı (`yazili-uyari-{n}-{Ad-Soyad}.pdf`)
- WhatsApp ile veliye bildirim

### Günlük İhlal Takibi (Kıyafet / Tören / Diğer)
- Fotoğraf yükleme + Tesseract.js OCR ile otomatik öğrenci eşleştirme
- Manuel eşleştirme ve onaylama
- Eşleşen öğrencilere toplu yazılı uyarı oluşturma
- İhlal istatistikleri

### Karne / Akademik Başarısızlık Bildirimi
- Karne fotoğrafından OCR ile öğrenci ve zayıf ders bilgisi çıkarma
- Otomatik PDF bildirimi üretimi
- Sınıf, öğretim yılı ve toplantı tarihi yönetimi

### Personel Yönetimi
- Müdür yardımcısı, rehber öğretmen, sınıf rehber öğretmeni kayıtları
- Sınıf ataması (sınıf rehber öğretmenleri için)

### WhatsApp Entegrasyonu
- Baileys kütüphanesi ile WhatsApp Web bağlantısı (QR kod)
- Devamsızlık ve yazılı uyarı için seçili velilere mesaj gönderimi
- Özelleştirilebilir mesaj şablonları (3 adet)
- Bağlantı durumu göstergesi

### Veli Bildirim Portalı
- Devamsızlık PDF'ini görüntüleme ve indirme için veli erişim sayfası

### Gösterge Paneli
- Aktif öğrenci, personel, devamsızlık, yazılı uyarı ve onaylı ihlal sayıları
- Devamsızlık gönderim durumu (Gönderildi / Gönderilmedi / Toplam)
- WhatsApp bağlantı durumu

### Ayarlar
- Okul adı ve müdür adı
- Özelleştirilebilir WhatsApp mesaj şablonları

## Teknik Yığın

| Katman | Teknoloji |
|--------|-----------|
| Masaüstü kabuğu | **Tauri v2** (Rust) |
| Node.js çalışma ortamı | Gömülü Node.js binary (sidecar — sistem Node.js gerektirmez) |
| Backend | Node.js 20 + Express 4 + TypeScript |
| Veritabanı | **SQLite** (Prisma ORM 5) |
| Frontend | React 18 + TypeScript + Vite 5 |
| PDF üretimi | PDFKit |
| PDF önizleme | MuPDF (mupdf npm) |
| OCR | Tesseract.js 7 |
| WhatsApp | @whiskeysockets/baileys |
| Kimlik doğrulama | JWT (HS256) + bcrypt |
| Doğrulama | Zod |
| Güvenlik | Helmet, CORS (yalnızca localhost), express-rate-limit, magic-byte dosya doğrulama |

## Kurulum ve Geliştirme

### Gereksinimler

- **Rust** (Tauri build için)
- **Node.js 20+** ve npm 9+ (geliştirme ortamı için)
- **Tauri CLI:** `cargo install tauri-cli`

> **Not:** Son kullanıcıların sistem Node.js kurmasına gerek yoktur. Node.js binary uygulamaya gömülüdür.

### Bağımlılıkları Yükleme

```bash
npm run install:all
```

### Geliştirme Modunda Çalıştırma

```bash
# Backend (ts-node-dev, port 4000)
cd backend && npm run dev

# Frontend (Vite dev server, port 5173)
cd frontend && npm run dev
```

### Tauri Uygulaması Olarak Çalıştırma

```bash
npx tauri dev
```

Bu komut sırasıyla backend'i, Prisma'yı, frontend'i ve Node.js sidecar'ı başlatır.

### İlk Yönetici Hesabı

Tauri ilk çalıştırıldığında **statik `admin/admin123` hesabı oluşturulmaz**. Yeni kurulumda `admin` kullanıcısı için rastgele geçici bir parola oluşturulur ve:

```text
%APPDATA%\OkulDesk\initial-admin-credentials.txt
```

dosyasına yazılır. Dosyadaki geçici parola ile `admin` hesabına giriş yaptıktan sonra şifrenizi değiştirin ve güvenlik için bu dosyayı silin.

Manuel `prisma:seed` kullanıyorsanız güvenli parolaları açıkça sağlayın:

```bash
SEED_ADMIN_PASSWORD="guclu-bir-admin-parolasi" \
SEED_PARENT_PASSWORD="guclu-bir-veli-parolasi" \
npm run prisma:seed
```

## Dağıtılabilir Paket Üretme (Windows)

```bash
npx tauri build
```

`src-tauri/target/release/bundle/` klasöründe `.msi` ve `.exe` kurulum dosyası oluşturulur.

## Yedekleme

OkulDesk SQLite veritabanını her başlatılışta günlük otomatik yedeklemeyi kontrol ederek `VACUUM INTO` ile tutarlı bir snapshot olarak yedekler.

Tauri ortamında yedekler:

```text
%APPDATA%\OkulDesk\backups
```

altında tutulur. Varsayılan retention süresi **30 gündür** ve `BACKUP_RETENTION_DAYS` ile değiştirilebilir. Yedekleme veri kaybı riskini azaltır; gerçek üretim kullanımından önce geri yükleme prosedürü ayrıca test edilmelidir.

## VPS / Sunucu Dağıtımı

OkulDesk bir **masaüstü uygulamasıdır**; doğrudan sunucu üzerine kurulmak üzere tasarlanmamıştır. Sunucu ortamı gerekiyorsa `docker-compose.yml` ve `nginx/` klasöründeki yapılandırmalar referans olarak bulunmaktadır; ancak aktif olarak bakımı yapılmamaktadır.

## Veritabanı

- **Konum:** `%APPDATA%\OkulDesk\database.db` (Windows)
- **Motor:** SQLite (Prisma ORM 5)
- **Şema yönetimi:** Tauri sidecar başlatılırken migration/bootstrap süreci çalıştırılır.
- **Yedek:** `%APPDATA%\OkulDesk\backups` altında otomatik SQLite snapshot'ları tutulur.

## JWT Güvenliği

Tauri sidecar ilk çalıştırmada `%APPDATA%\OkulDesk\.jwt_secret` dosyasına rastgele gizli anahtar kaydeder. Uygulama her başlatılışında bu anahtarı okur; dosya silinirse aktif JWT oturumları geçersiz olur.

## Güvenlik

Detaylı production güvenlik kuralları için [`SECURITY.md`](SECURITY.md) dosyasına bakın.

## Proje Yapısı

```
okuldesk/
├── src-tauri/               # Tauri Rust kabuğu
│   ├── binaries/            # Gömülü Node.js binary
│   ├── src/lib.rs           # Tauri komutları ve sidecar yönetimi
│   └── tauri.conf.json      # Tauri yapılandırması
├── backend/
│   ├── prisma/
│   │   └── schema.prisma    # Veri modelleri (SQLite)
│   ├── src/
│   │   ├── app.ts           # Express uygulaması, middleware, route kayıtları
│   │   ├── server.ts        # HTTP sunucu başlatma, DB bootstrap ve ilk admin
│   │   ├── tauri-sidecar.ts # Tauri sidecar giriş noktası
│   │   └── modules/
│   │       ├── auth/        # JWT giriş, şifre değiştirme, rate-limit
│   │       ├── students/    # Öğrenci CRUD, veli yönetimi, Excel aktarım
│   │       ├── absenteeism/ # Devamsızlık mektubu yükleme, PDF önizleme
│   │       ├── warnings/    # Yazılı uyarı CRUD, PDF üretimi
│   │       ├── violations/  # İhlal yükleme, OCR eşleştirme, onaylama
│   │       ├── gradeReport/ # Karne OCR, akademik bildirim PDF
│   │       ├── whatsapp/    # Baileys bağlantısı, mesaj gönderimi
│   │       ├── staff/       # Personel yönetimi
│   │       ├── settings/    # Okul adı, müdür adı, WA şablonları
│   │       └── shared/
│   │           ├── middleware/   # auth, adminOnly, errorHandler, magicByte...
│   │           └── utils/        # DB bootstrap, audit, Prisma, backup
│   └── package.json
├── frontend/
│   └── src/
│       ├── pages/admin/     # Dashboard, öğrenci, devamsızlık, uyarı, ihlal...
│       ├── components/      # Paylaşılan UI bileşenleri
│       ├── services/api.ts  # Axios instance (JWT Bearer token)
│       └── context/         # Auth context, Settings context
├── SECURITY.md
└── README.md
```
