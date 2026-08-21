# OkulDesk Güvenlik Notları

## Kimlik doğrulama

- Parolalar bcrypt ile hashlenir.
- JWT secret production ortamında güçlü ve rastgele olmalıdır.
- İlk çalıştırmada statik `admin/admin123` hesabı oluşturulmaz.
- Yeni kurulumda rastgele geçici yönetici parolası `%APPDATA%\OkulDesk\initial-admin-credentials.txt` dosyasına yazılır ve ilk girişten sonra dosya silinmelidir.
- Yeni/değiştirilen parolalar en az 10 karakter, harf ve rakam içermelidir.

## API güvenliği

- Helmet aktif.
- CORS yalnızca uygulamanın beklenen localhost/Tauri kaynaklarını kabul eder.
- Global API rate limit 15 dakikada 600 istekle sınırlandırılmıştır.
- Giriş, dosya yükleme ve pahalı OCR/PDF işlemleri ayrıca sınırlandırılır.
- JSON request body 1 MB ile sınırlandırılmıştır.
- Dosya yüklemelerinde uzantı/MIME kontrolünün yanında magic-byte doğrulaması uygulanır.
- `X-Powered-By` başlığı kapatılmıştır.

## Veri güvenliği

OkulDesk öğrenci, veli, personel ve iletişim verileri içerir. Veritabanı ve yüklenen dosyalar yerel AppData alanında tutulmalıdır. Bu dosyalar Git deposuna kesinlikle eklenmemelidir.

## Yedekleme

SQLite veritabanı `VACUUM INTO` ile tutarlı snapshot olarak yedeklenir. Tauri ortamında yedekler `%APPDATA%\OkulDesk\backups` altında tutulur ve varsayılan olarak 30 günden eski yedekler temizlenir.

Yedek almak veri kaybı riskini azaltır; ancak üretim öncesinde geri yükleme prosedürü ayrıca test edilmelidir.

## Güvenlik açığı bildirimi

Gerçek öğrenci/veli verileri içeren dosyaları veya kişisel bilgileri GitHub issue'larında paylaşmayın. Güvenlik açıklarını herkese açık issue yerine repository sahibine özel kanaldan bildirin.
