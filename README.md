# OkulDesk

Okul yönetimi için geliştirilmiş masaüstü uygulaması. Devamsızlık takibi, yazılı uyarı yönetimi, kıyafet/tören ihlali kaydı, karne bazlı akademik başarısızlık bildirimi ve WhatsApp üzerinden veli bilgilendirmesi tek çatı altında sunar.

## Genel Bakış

OkulDesk, **Electron** tabanlı bir masaüstü uygulamasıdır. Kurulum gerektirmeksizin Windows'ta tek `.exe` ile çalışır; internete ihtiyaç duymaz. Tüm veriler yerel SQLite veritabanında saklanır.

```
Electron (shell)
  └── Express.js (backend, port 4000)
        └── SQLite (Prisma ORM, better-sqlite3)
  └── React + Vite (frontend, backend üzerinden statik servis)
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
| Masaüstü kabuğu | Electron 28 |
| Backend | Node.js 20 + Express 4 + TypeScript |
| Veritabanı | SQLite (Prisma ORM 5, better-sqlite3) |
| Frontend | React 18 + TypeScript + Vite 5 |
| PDF üretimi | PDFKit |
| PDF önizleme | MuPDF (mupdf npm) |
| OCR | Tesseract.js 7 |
| WhatsApp | @whiskeysockets/baileys |
| Kimlik doğrulama | JWT (HS256) + bcrypt |
| Doğrulama | Zod |
| Güvenlik | Helmet, CORS (yalnızca localhost), express-rate-limit |

## Kurulum ve Geliştirme

### Gereksinimler

- Node.js 20+
- npm 9+

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

### Electron Uygulaması Olarak Çalıştırma

```bash
npm run electron:start
```

Bu komut sırasıyla şunları yapar:
1. Backend TypeScript'i derler (`tsc`)
2. Prisma Client üretir
3. Frontend'i Vite ile üretim modunda derler (`backend/dist/public/` hedefine)
4. Electron'u başlatır

### Varsayılan Giriş

- **Kullanıcı adı:** `admin`
- **Şifre:** `admin123`

## Dağıtılabilir Paket Üretme (Windows)

```bash
npm run dist
```

`dist-electron/` klasöründe `OkulDesk Setup x.x.x.exe` kurulum dosyası oluşturulur.

## VPS / Sunucu Dağıtımı

### 1. Sunucu Hazırlığı

```bash
# Sistem güncellemesi
sudo apt update && sudo apt upgrade -y

# Docker kurulumu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Docker Compose kurulumu
sudo apt install docker-compose-plugin -y

# Güvenlik duvarı
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Proje Dosyalarını Yükleme

```bash
# Git ile
git clone <repo-url> /opt/devamsizlik
cd /opt/devamsizlik

OkulDesk bir **masaüstü uygulamasıdır**; doğrudan sunucu üzerine kurulmak üzere tasarlanmamıştır. Sunucu ortamı gerekiyorsa `docker-compose.yml` ve `nginx/` klasöründeki yapılandırmalar referans olarak bulunmaktadır; ancak aktif olarak bakımı yapılmamaktadır.

## Veritabanı

- **Konum:** `%APPDATA%\OkulDesk\database.db` (Windows)
- **Motor:** SQLite (`better-sqlite3`)
- **Şema yönetimi:** Prisma migrations kullanılmaz; `backend/src/modules/shared/utils/initDb.ts` her başlatmada `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN` ile tabloları oluşturur ve mevcut veritabanlarını günceller.
- **Yedek almak için** dosyayı kopyalamanız yeterlidir.

## JWT Güvenliği

İlk çalıştırmada Electron `%APPDATA%\OkulDesk\.jwt_secret` dosyasına 48 bayt rastgele üretilmiş gizli anahtar kaydeder. Uygulama her başlatılışında bu anahtarı okur; dosya silinirse tüm aktif oturumlar geçersiz olur.

## Proje Yapısı

```
okuldesk/
├── electron/
│   └── main.js               # Electron ana süreci: backend başlatma, pencere, JWT secret
├── backend/
│   ├── prisma/
│   │   └── schema.prisma     # Veri modelleri (SQLite)
│   ├── fonts/                # PDFKit için Times New Roman ve benzeri fontlar
│   ├── src/
│   │   ├── app.ts            # Express uygulaması, middleware, route kayıtları
│   │   ├── server.ts         # HTTP sunucu başlatma, initDb çağrısı
│   │   └── modules/
│   │       ├── auth/         # JWT giriş, şifre değiştirme, rate-limit
│   │       ├── students/     # Öğrenci CRUD, veli yönetimi, Excel aktarım
│   │       ├── absenteeism/  # Devamsızlık mektubu yükleme, PDF önizleme, istatistik
│   │       ├── warnings/     # Yazılı uyarı CRUD, PDF üretimi
│   │       ├── violations/   # İhlal yükleme, OCR eşleştirme, onaylama
│   │       ├── gradeReport/  # Karne OCR, akademik bildirim PDF
│   │       ├── parentMeeting/       # Veli toplantısı takibi
│   │       ├── parentNotification/  # Veli bildirim PDF üretimi
│   │       ├── notifications/       # WhatsApp mesaj şablonu üretimi
│   │       ├── whatsapp/    # Baileys bağlantısı, mesaj gönderimi
│   │       ├── staff/       # Personel yönetimi
│   │       ├── settings/    # Okul adı, müdür adı, WA şablonları
│   │       └── shared/
│   │           ├── middleware/   # auth, adminOnly, errorHandler
│   │           ├── utils/
│   │           │   ├── initDb.ts # SQLite şema bootstrap
│   │           │   └── prisma.ts # Prisma istemcisi
│   │           └── config.ts     # Ortam değişkenleri
│   └── package.json
├── frontend/
│   └── src/
│       ├── pages/admin/      # Dashboard, öğrenci, devamsızlık, uyarı, ihlal, karne, WA...
│       ├── components/       # Paylaşılan UI bileşenleri
│       ├── services/api.ts   # Axios instance (JWT Bearer token)
│       └── context/          # Auth context
├── assets/                   # Uygulama ikonu
├── electron/main.js
├── package.json              # Kök: Electron + build betikleri
└── README.md
```

## API Uç Noktaları (Özet)

Tüm `/api/*` rotaları `authMiddleware` (JWT Bearer) gerektirir; değiştirici işlemler ek olarak `adminOnly` denetiminden geçer.

| Modül | Prefix |
|-------|--------|
| Kimlik doğrulama | `/api/auth` |
| Öğrenciler | `/api/students` |
| Devamsızlık | `/api/absenteeism` |
| Yazılı Uyarı | `/api/warnings` |
| İhlaller | `/api/violations` |
| Karne Raporu | `/api/grade-reports` |
| Veli Bildirimi | `/api/parent-notification` |
| WhatsApp | `/api/whatsapp` |
| Personel | `/api/staff` |
| Ayarlar | `/api/settings` |

## Windows SmartScreen Uyarısı

Uygulama kurulum dosyası (`OkulDesk Setup x.x.x.exe`) ilk kez çalıştırıldığında Windows SmartScreen **"Bilinmeyen yayımcı"** veya **"Bilgisayarınız korundu"** uyarısı gösterebilir.

Bu uyarı, kurulum dosyasının bir sertifika yetkilisinden (Code Signing Certificate) imzalanmamış olmasından kaynaklanmaktadır. Uygulama güvenlidir.

### Uyarıyı Geçme

1. SmartScreen uyarı ekranında **"Daha fazla bilgi"** (More info) bağlantısına tıklayın.
2. Beliren **"Yine de çalıştır"** (Run anyway) düğmesine tıklayın.
3. Kurulum devam edecektir.

> **Sistem yöneticileri için:** Kurulum dosyasını Group Policy aracılığıyla dağıtıyorsanız, dosyayı NTFS Alternate Data Stream `Zone.Identifier` bilgisini kaldırarak imzasız çalıştırabilirsiniz:
> ```powershell
> Unblock-File -Path ".\OkulDesk Setup 1.0.0.exe"
> ```

## Lisans

Okul içi kullanım için geliştirilmiştir.
