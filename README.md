# Devamsızlık Mektubu Sistemi

Okul içi devamsızlık mektubu yönetim ve veli bilgilendirme sistemi.

## Özellikler

- **Admin paneli:** Öğrenci yönetimi, devamsızlık mektubu yükleme (PDF/JPG/PNG), OTP oluşturma
- **WhatsApp bildirim:** Veli bağlantı ve şifre gönderimi (manuel WhatsApp mesajı)
- **Veli portalı:** Benzersiz kısa token bağlantısı + 4 haneli OTP ile mektup görüntüleme/indirme
- **Güvenli OTP sistemi:** bcrypt hash, 24 saat geçerlilik, maksimum 3 deneme hakkı
- **Uyarı numarası takibi:** Her öğrenci için 1-5 arası otomatik uyarı numarası
- **Excel toplu aktarım:** Öğrenci ve veli bilgilerini Excel ile içe aktarma
- **Sınıf bazlı tab navigasyonu:** Öğrenci listesinde sınıflara göre gruplama
- **Mobil uyumlu:** Veli portalı mobil-first tasarım, admin panelinde hamburger menü
- **JWT kimlik doğrulama:** Rol tabanlı erişim (Admin/Veli)
- **Docker ile kolay dağıtım:** PostgreSQL, Backend, Frontend, Nginx, SSL (Let's Encrypt)

## Hızlı Başlangıç (Geliştirme)

### Gereksinimler

- Node.js 20+
- PostgreSQL 16+
- npm veya yarn

### Backend

```bash
cd backend
cp .env.example .env      # .env dosyasını düzenleyin
npm install
npx prisma migrate dev    # Veritabanı oluştur
npx prisma db seed        # Örnek veri
npm run dev               # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

### Varsayılan Giriş

- **Admin:** `admin` / `admin123`

## Docker ile Çalıştırma

```bash
cp .env.example .env      # .env dosyasını düzenleyin
docker-compose up -d --build
```

Sistem `http://localhost` adresinde çalışır.

### Seed (Docker)

```bash
docker-compose exec backend npx prisma db seed
```

---

## VPS Dağıtım Rehberi (Ubuntu 22.04)

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

# Veya SCP ile
scp -r . user@sunucu-ip:/opt/devamsizlik
```

### 3. Ortam Değişkenlerini Ayarlama

```bash
cd /opt/devamsizlik
cp .env.example .env
nano .env
```

`.env` dosyasını doldurun:
```
DB_PASSWORD=guclu-veritabani-sifresi
JWT_SECRET=en-az-64-karakter-rastgele-bir-anahtar
FRONTEND_DOMAIN=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

### 4. SSL Sertifikası (Let's Encrypt)

```bash
# İlk sertifika alma (nginx çalışmadan önce)
mkdir -p nginx/ssl

# Geçici nginx ayağa kaldır (HTTP only)
docker compose up -d frontend backend db

# Certbot ile sertifika al
docker compose --profile production run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d yourdomain.com \
  --email your@email.com \
  --agree-tos --no-eff-email

# HTTPS nginx'i başlat
docker compose --profile production up -d
```

### 5. nginx.conf Düzenleme

`nginx/nginx.conf` dosyasında `yourdomain.com` yerine kendi alan adınızı yazın.

### 6. Sistemi Başlatma

```bash
cd /opt/devamsizlik
docker compose --profile production up -d --build
```

### 7. Veritabanı Seed

```bash
docker compose exec backend npx prisma db seed
```

### 8. SSL Sertifika Yenileme (Cron)

```bash
# Crontab ekle
sudo crontab -e

# Her ay sertifika yenile
0 3 1 * * cd /opt/devamsizlik && docker compose --profile production run --rm certbot renew && docker compose --profile production restart nginx
```

### 9. Loglar

```bash
# Tüm servisler
docker compose logs -f

# Sadece backend
docker compose logs -f backend

# Sadece veritabanı
docker compose logs -f db
```

### 10. Yedekleme

```bash
# Veritabanı yedeği
docker compose exec db pg_dump -U postgres devamsizlik_db > backup_$(date +%Y%m%d).sql

# Geri yükleme
docker compose exec -T db psql -U postgres devamsizlik_db < backup_20250228.sql
```

---

## API Endpoints

### Auth
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | Giriş |
| GET | `/api/auth/profile` | Profil bilgisi |
| PUT | `/api/auth/change-password` | Şifre değiştir |

### Students (Admin)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/students` | Öğrenci listesi (sayfalama, arama) |
| GET | `/api/students/:id` | Öğrenci detay |
| POST | `/api/students` | Yeni öğrenci (opsiyonel veli bilgileri ile) |
| PUT | `/api/students/:id` | Öğrenci güncelle |
| DELETE | `/api/students/:id` | Öğrenci sil |
| POST | `/api/students/:id/assign-parent` | Veli ata |
| PUT | `/api/students/parents/:parentId` | Veli güncelle |
| DELETE | `/api/students/:id/parents/:parentId` | Veli bağlantısını kaldır |
| POST | `/api/students/import-excel` | Excel ile öğrenci aktar |
| POST | `/api/students/import-parents` | Excel ile veli aktar |

### Absenteeism (Admin)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/absenteeism` | Devamsızlık listesi |
| GET | `/api/absenteeism/stats` | İstatistikler (görüntülenen/bekleyen) |
| GET | `/api/absenteeism/:id` | Devamsızlık detay |
| POST | `/api/absenteeism` | Dosya yükle - PDF/JPG/PNG (multipart) |
| POST | `/api/absenteeism/:id/generate-otp` | OTP oluştur |
| DELETE | `/api/absenteeism/:id` | Kayıt sil |
| GET | `/api/absenteeism/:id/pdf` | Dosya görüntüle (auth gerekli) |
| GET | `/api/absenteeism/:id/pdf/download` | Dosya indir (auth gerekli) |

### OTP (Public)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/otp/verify` | OTP doğrula (token + kod) |
| GET | `/api/otp/info/:token` | Token bilgisi sorgula |

---

## Proje Yapısı

```
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── students/
│   │   │   ├── absenteeism/
│   │   │   ├── otp/
│   │   │   ├── notifications/
│   │   │   └── shared/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   └── parent/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

## Lisans

Bu proje okul içi kullanım için geliştirilmiştir.
