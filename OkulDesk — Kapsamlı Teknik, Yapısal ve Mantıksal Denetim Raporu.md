# OkulDesk — Kapsamlı Teknik, Yapısal ve Mantıksal Denetim Raporu

**Repository:** `zapo-gh/devamsizlik-mektubu`  
**İncelenen dal:** `main`  
**Tarih:** 19 Ağustos 2026  
**Denetim türü:** Statik kaynak kodu / mimari / veri modeli / güvenlik / dağıtım denetimi

---

## 1. Yönetici Özeti

OkulDesk, başlangıçta devamsızlık mektubu üretimi amacıyla ortaya çıkmışken zaman içerisinde:

- öğrenci yönetimi,
- veli yönetimi,
- devamsızlık,
- yazılı uyarı,
- günlük ihlal,
- OCR,
- karne/akademik başarısızlık,
- personel,
- WhatsApp,
- veli toplantıları,
- tebliğ,
- nöbet,
- kurul/toplantı,
- komisyon,
- yıllık plan,
- belirli gün ve haftalar,
- sosyal faaliyet,
- gezi,
- kulüp,
- satın alma,
- tedarikçi,
- seyahat yolluğu,
- personel nakil

gibi çok sayıda modülü kapsayan geniş bir okul yönetim sistemine dönüşmüş.

Mimari olarak React + Vite + TypeScript frontend, Node.js + Express + Prisma + SQLite backend ve Tauri v2 masaüstü kabuğu kullanılıyor.

Temel mimari:

```text
Tauri v2
   │
   ├── React + Vite
   │
   └── Node.js Backend
          │
          ├── Express
          ├── Prisma
          ├── SQLite
          ├── PDFKit
          ├── Tesseract
          ├── MuPDF
          └── Baileys / WhatsApp
```

Bu yapı genel olarak mantıklı.

Ancak projede zaman içinde yapılan hızlı özellik eklemelerinin sonucunda bazı **mimari borçlar** oluşmuş.

### Genel değerlendirme

| Alan | Değerlendirme |
|---|---:|
| Genel mimari | 7.5/10 |
| Backend | 7/10 |
| Frontend | 7/10 |
| Veri modeli | 6/10 |
| Güvenlik | 6/10 |
| Veri bütünlüğü | 5.5/10 |
| Tauri dağıtımı | 4/10 |
| Kod sürdürülebilirliği | 6/10 |
| Dokümantasyon | 4/10 |
| Test altyapısı | 2/10 |
| Üretim ortamına hazır olma | 6/10 |

**Genel sonuç: yaklaşık 6.2/10**

Bu düşük bir proje kalitesi anlamına gelmiyor. Aksine proje oldukça gelişmiş. Ancak özellik sayısı arttıkça mevcut altyapının bazı bölümleri artık yeniden yapılandırılmayı gerektiriyor.

---

# 2. EN KRİTİK BULGULAR

Aşağıdaki konular benim öncelikli olarak düzeltilmesini önerdiğim alanlardır.

## KRİTİK-1 — Tauri + Node.js dağıtım mimarisi sorunlu

Bu en önemli teknik problem.

Tauri tarafında:

```rust
let mut cmd = Command::new("node");
cmd.arg(&script_path);
cmd.spawn()
```

kullanılıyor.

Yani uygulama kurulduğunda backend'i çalıştırmak için sistemde **Node.js bulunmasına güveniliyor**.

Dahası `find_sidecar_script()` şu gibi yolları arıyor:

```text
backend/dist/tauri-sidecar.js
../backend/dist/tauri-sidecar.js
```

Fakat `tauri.conf.json` içinde backend dosyalarının Tauri paketine alınmasını sağlayacak gerçek bir `externalBin` veya uygun `resources` yapılandırması bulunmuyor.

Tauri konfigürasyonunda frontend:

```json
"frontendDist": "../backend/dist/public"
```

olarak tanımlı; ancak Node backend runtime'ı paketlenmiş görünmüyor.

Bu nedenle temiz bir Windows bilgisayarında:

- Node.js yoksa,
- backend/dist uygulama yanında bulunmuyorsa,

uygulama açılabilir fakat backend başlayamayabilir.

Bu, **kurulum paketinin üretim güvenilirliği açısından kritik bir problem**.

### Öneri

İki seçenek var:

### Seçenek A — Gerçek Tauri Sidecar

Backend'i gerçek bir binary haline getirip:

```text
src-tauri/binaries/okuldesk-backend-x86_64-pc-windows-msvc.exe
```

şeklinde paketlemek.

### Seçenek B — Embedded Node

Node runtime'ı uygulama ile birlikte dağıtmak.

Benim tercihim:

**Tauri + gerçek Node sidecar binary**

olur.

Mevcut roadmap zaten gerçek sidecar yaklaşımını öngörüyor ancak uygulanan `lib.rs` halen sistemdeki `node` komutuna bağımlı. 

---

# 3. KRİTİK — README ile gerçek proje arasında ciddi uyumsuzluk

README hâlâ uygulamayı:

> Electron tabanlı masaüstü uygulaması

olarak tanımlıyor.

Ayrıca:

```text
electron/main.js
```

yapısından söz ediyor.

Fakat mevcut kök `package.json`:

```json
"tauri": "tauri"
"tauri:dev": ...
"tauri:build": ...
```

kullanıyor.

Yani proje artık Tauri'ye geçmiş.

Ayrıca README'de:

```bash
npm run electron:start
npm run dist
```

gibi komutlar anlatılırken mevcut `package.json` içerisinde bu scriptler bulunmuyor. 

### Sonuç

Yeni geliştirici README'yi takip ederse projeyi yanlış şekilde çalıştırmaya çalışacaktır.

### Öneri

README baştan yazılmalı:

```text
OkulDesk
├── Tauri
├── React/Vite
├── Node.js Sidecar
├── SQLite
└── Prisma
```

olarak güncellenmeli.

---

# 4. KRİTİK — Prisma migration sistemi ile initDb sistemi birbirine karışmış

Burada önemli bir mimari problem var.

Projede:

```text
backend/prisma/migrations/
```

altında Prisma migration'ları bulunuyor.

Ancak runtime tarafında:

```text
initializeDatabase()
```

çalıştırılıyor ve tablolar:

```sql
CREATE TABLE IF NOT EXISTS
ALTER TABLE ADD COLUMN
```

yöntemiyle oluşturuluyor. 

README de açıkça:

> Prisma migrations kullanılmaz.

diyor. 

Bu durumda iki farklı schema evolution sistemi var:

```text
A) Prisma migrations
B) initDb.ts manuel migration/bootstrap
```

Bu uzun vadede ciddi schema drift oluşturabilir.

### Örnek risk

`schema.prisma` içerisinde `Staff`:

```text
tcKimlikNo
brans
kurumSicilNo
emekliSicilNo
unvan
gorev
```

gibi alanlara sahip. 

Ancak `initDb.ts` içerisindeki görünen Staff oluşturma yapısı daha eski ve daha sınırlı:

```text
id
name
role
className
isActive
createdAt
```

üzerinden ilerliyor. 

Bu durum özellikle eski veritabanlarının güncellenmesinde dikkat edilmesi gereken ciddi bir schema drift göstergesidir.

### Önerim

Tek sistem seçilmeli.

Ben:

**Prisma migration sistemini ana kaynak**

olarak seçerdim.

`initDb.ts` yalnızca:

```text
ilk veritabanı oluşturma
uygulama dizini hazırlama
PRAGMA ayarları
seed
```

gibi işlemler için kullanılmalı.

Schema değişiklikleri:

```bash
prisma migrate deploy
```

ile yönetilmeli.

---

# 5. KRİTİK — GitHub repository'sinde veritabanları ve personel Excel'i bulunuyor

Repository içerisinde:

```text
backend/prisma/dev.db
backend/prisma/devamsizlik.db
backend/prisma/prisma/dev.db
backend/prisma/prisma/devamsizlik.db
Personel_ListesiOzet_Bilgiler_20260813_161830.xls
```

gibi gerçek veri içerebilecek dosyalar bulunuyor.

`.gitignore` ise DB dosyalarını engellemiyor. 

Bu çok önemli.

Özellikle:

```text
Personel_ListesiOzet_Bilgiler_20260813_161830.xls
```

adı gerçek personel verisi içerme ihtimalini oldukça yükseltiyor.

Ayrıca veritabanında:

- öğrenci,
- veli,
- telefon,
- personel,
- T.C. kimlik,
- sicil,
- akademik bilgiler

gibi hassas veriler bulunabilecek modeller mevcut. 

### Yapılması gereken

Repository'den:

```text
*.db
*.sqlite
*.sqlite3
*.xls
*.xlsx
```

gibi veri dosyaları çıkarılmalı.

Ancak yalnızca son commit'ten silmek yeterli değil.

Eğer gerçekten kişisel veri içeriyorsa Git geçmişinden de temizlenmeli.

---

# 6. KRİTİK — WhatsApp consent mantığında mantıksal açık var

WhatsApp servisindeki:

```text
checkConsent()
```

fonksiyonu yalnızca:

```text
DECLINED
```

durumunu engelliyor.

Yani:

```text
PENDING
```

olan veliye de mesaj gönderilebiliyor.

Oysa sistemde üç durum tanımlanmış:

```text
PENDING
ACCEPTED
DECLINED
```

ve consent mantığının doğal olarak:

```text
ACCEPTED → gönder
PENDING → gönderme
DECLINED → gönderme
```

olması gerekir.

Mevcut kod:

```text
DECLINED → gönderme
PENDING → gönder
ACCEPTED → gönder
```

mantığına dönüşüyor. 

Bu, özellikle okul/veli iletişimi açısından düzeltilmesi gereken önemli bir mantık hatasıdır.

### Doğru mantık

```ts
if (!parent || parent.waConsentStatus !== 'ACCEPTED') {
    throw new Error(...)
}
```

---

# 7. KRİTİK — WhatsApp oturumu uygulama kapanırken siliniyor

`disconnect()` içinde:

```ts
await socket.logout();
```

ve ardından:

```ts
fs.rmSync(getAuthDir(), { recursive: true, force: true });
```

çalışıyor. 

`server.ts` de graceful shutdown sırasında:

```ts
await whatsappService.disconnect()
```

çağırıyor. 

Dolayısıyla uygulama kapatıldığında:

1. WhatsApp logout oluyor.
2. WhatsApp auth klasörü siliniyor.
3. Uygulama tekrar açıldığında oturum korunmuyor.
4. Yeniden QR okutmak gerekiyor.

Bu tasarım açısından büyük ihtimalle istenmeyen bir davranış.

### Doğru yaklaşım

Normal uygulama kapanışı:

```text
socket.end()
```

veya bağlantıyı düzgün kapat.

Ama:

```text
logout()
+ auth klasörünü sil
```

yalnızca kullanıcı gerçekten:

> WhatsApp bağlantısını kaldır

dediğinde yapılmalı.

---

# 8. KRİTİK — Veli hesabı oluştururken güvenlik problemi

`addParentToStudent()` içerisinde:

```ts
const passwordRaw = phone.slice(-6);
```

kullanılıyor. 

Yani veli hesabının ilk şifresi telefon numarasının son 6 hanesi.

Bu ciddi şekilde tahmin edilebilir.

Üstelik burada:

```text
mustChangePassword
```

işaretinin de zorunlu olarak `true` yapılması gerekiyor.

Daha önceki `create()` fonksiyonunda rastgele şifre üretimi yapılmış olması olumlu:

```ts
crypto.randomBytes(...)
```

ancak iki farklı veli oluşturma yöntemi olması güvenlik açısından tutarsız.

### Öneri

Tek bir:

```text
ParentAccountService
```

oluşturulmalı.

Şifre:

```text
crypto.randomBytes(...)
```

ile üretilmeli.

İlk giriş:

```text
mustChangePassword = true
```

olmalı.

---

# 9. KRİTİK — rememberMe gerçekte çalışmıyor

Backend:

```ts
rememberMe ? '30d' : config.jwt.expiresIn
```

ile doğru bir şekilde farklı token ömrü üretiyor. 

Ancak frontend login fonksiyonunda token:

```ts
localStorage.setItem('token', newToken);
sessionStorage.setItem('token', newToken);
```

şeklinde **her iki storage'a da yazılıyor.** 

Sonuç:

```text
rememberMe = false
```

olsa bile sessionStorage nedeniyle oturum tarayıcı penceresi/uygulama yaşam döngüsü boyunca kalıyor; localStorage da ayrıca dolduruluyor.

### Doğru davranış

```text
rememberMe = true
    → localStorage

rememberMe = false
    → sessionStorage
```

olmalı.

---

# 10. YÜKSEK — Öğrenci silme işlemi fazla agresif

Schema:

```text
Student
  ├── Absenteeism
  ├── WrittenWarning
  ├── DailyViolation
  ├── GradeReportStudent
  └── StudentClubMember
```

ilişkilerinin çoğunda:

```text
onDelete: Cascade
```

kullanıyor. 

Ve service:

```ts
prisma.student.delete()
```

yapıyor. 

Yani öğrenci silindiğinde geçmiş:

- devamsızlık,
- uyarı,
- ihlal,
- karne raporu,
- kulüp üyeliği

gibi kayıtlar da silinebiliyor.

Bir okul otomasyonu açısından bu riskli.

### Daha doğru model

Öğrenci:

```text
ACTIVE
INACTIVE
TRANSFERRED
GRADUATED
```

gibi durumlarla pasifleştirilmeli.

Gerçek DELETE:

**istisnai yönetici işlemi** olmalı.

Özellikle resmi belge geçmişlerinin korunması açısından bu çok daha sağlıklı.

---

# 11. YÜKSEK — SQLite WAL ile yedekleme dokümantasyonu yanlış/eksik

`initDb.ts`:

```sql
PRAGMA journal_mode=WAL
```

çalıştırıyor. 

README ise:

> Yedek almak için dosyayı kopyalamanız yeterlidir.

diyor. 

WAL modunda güvenli yedekleme yalnızca:

```text
database.db
```

dosyasını körlemesine kopyalamakla garanti edilmemeli.

Çünkü:

```text
database.db
database.db-wal
database.db-shm
```

dosyaları çalışma sırasında birlikte rol oynayabilir.

### Öneri

Uygulamaya:

**Ayarlar → Yedekleme**

eklenmeli.

Ve SQLite'ın güvenli backup yaklaşımı kullanılmalı.

Örneğin:

```text
Yedek Al
↓
SQLite checkpoint / backup
↓
timestamped .db
↓
SHA-256
```

Ayrıca:

```text
Otomatik günlük yedek
Son 30 yedeği sakla
```

gibi seçenekler çok faydalı olur.

---

# 12. YÜKSEK — Dosya yükleme yalnızca MIME bilgisine güveniyor

PDF/JPG/PNG upload:

```ts
allowedMimeTypes.includes(file.mimetype)
```

ile kontrol ediliyor. 

MIME header istemci tarafından manipüle edilebilir.

### Daha güvenli yaklaşım

Dosyanın gerçek içeriği kontrol edilmeli:

```text
PDF → magic bytes %PDF
JPEG → FF D8 FF
PNG → 89 50 4E 47
```

ve mümkünse:

```text
sharp
MuPDF
```

ile dosya gerçekten parse edilebiliyor mu kontrol edilmeli.

---

# 13. YÜKSEK — Tauri güvenlik politikası fazla gevşek

Express:

```ts
contentSecurityPolicy: false
```

yapıyor.

Tauri:

```json
"csp": null
```

kullanıyor. 

Bu masaüstü uygulaması için çalışabilir; ancak güvenlik katmanını gereksiz yere zayıflatıyor.

Özellikle uygulama:

- dosya sistemi,
- Tauri pluginleri,
- shell,
- localhost backend,
- kişisel veri

ile çalıştığından CSP mümkün olduğunca kısıtlanmalı.

### Öneri

Üretim için kontrollü CSP:

```text
default-src 'self';
connect-src 'self' http://127.0.0.1:4000;
img-src 'self' data: blob:;
style-src 'self' 'unsafe-inline';
script-src 'self';
```

benzeri bir yapı düşünülmeli.

---

# 14. YÜKSEK — Veri modeli fazla serbest

Schema içerisinde çok sayıda:

```text
String
```

tipinde enum benzeri alan var:

```text
role
status
type
procedureType
academicYear
matchedBy
```

vb. 

Örneğin:

```text
status = "AKTIF"
```

yerine yanlışlıkla:

```text
status = "AKTİF"
```

veya:

```text
status = "aktif"
```

yazılabilir.

SQLite'ın enum desteğinin olmaması anlaşılabilir; ancak uygulama katmanında Zod enum'ları kullanılmalı.

Örneğin:

```ts
z.enum([
  'AKTIF',
  'PASIF'
])
```

---

# 15. YÜKSEK — Para değerleri Float olarak tutuluyor

Özellikle satın alma/yolluk modellerinde:

```text
estimatedCost Float
offeredPrice Float
estimatedUnitPrice Float
transportCost Float
dailyAllowance Float
accommodationCost Float
totalCost Float
```

kullanılıyor. 

Finansal verilerde floating-point kullanmak doğru yaklaşım değil.

Örneğin:

```text
0.1 + 0.2
```

gibi klasik floating-point problemleri ortaya çıkabilir.

### Öneri

Kuruş bazında integer:

```text
10000 = 100,00 TL
```

veya uygun bir Decimal yaklaşımı.

---

# 16. YÜKSEK — Tarihler String olarak tutuluyor

Örneğin:

```text
OrderLetter.date String
deliveryDate String
Procurement.date String
FieldTrip.date String
plannedDate String
transferDate String
```

gibi alanlar var. 

Bu:

- sıralama,
- tarih aralığı,
- takvim,
- raporlama,
- yıl değişimi,
- bölgesel tarih formatı

konularında ileride sorun çıkarabilir.

### Öneri

Gerçek tarih:

```text
DateTime
```

kullanılmalı.

Gösterim:

```text
19.08.2026
```

frontend'de yapılmalı.

---

# 17. ORTA-YÜKSEK — JSON string alanları aşırı kullanılmış

Örneğin:

```text
failedSubjects String
commissionMembers String?
items String
extraData String?
members String?
```

gibi alanlar var. 

Bu başlangıçta pratik ama sistem büyüdükçe:

```text
JSON.parse()
JSON.stringify()
```

üzerinden yönetilen yarı-şemalı veri haline geliyor.

Özellikle:

```text
extraData
```

fazla kullanılmış.

Bu alan kısa vadede geliştirmeyi hızlandırır fakat uzun vadede:

- veri bütünlüğü,
- migration,
- raporlama,
- sorgulama,
- validation

açısından borç oluşturur.

### Öneri

Her modül için gerçekten gerekli ilişkisel alanlar ayrı modele taşınmalı.

`extraData` yalnızca gerçekten esnek metadata için bırakılmalı.

---

# 18. ORTA-YÜKSEK — Denormalizasyon fazla

Bazı modellerde:

```text
assignedStaffId
assignedStaffName
```

birlikte tutuluyor.

Benzer şekilde:

```text
memberCount
```

ayrı tutuluyor.

Bu şu riski doğuruyor:

```text
assignedStaffId = 123
assignedStaffName = "Ali Veli"
```

iken personelin adı değiştiğinde:

```text
Staff.name = "Ali Veli Yılmaz"
```

oluyor ama diğer tabloda:

```text
assignedStaffName = "Ali Veli"
```

kalabiliyor.

### Öneri

Normal durumda:

```text
assignedStaffId
```

yeterli.

İsim gerektiğinde relation üzerinden çekilmeli.

---

# 19. ORTA — Kulüp memberCount veri tutarlılığı

`StudentClub` içerisinde:

```text
memberCount
```

tutuluyor.

Ama zaten:

```text
StudentClubMember[]
```

ilişkisi var. 

Dolayısıyla:

```text
memberCount
```

ile gerçek üyelik sayısının farklılaşması mümkün.

### Öneri

Ya:

```text
COUNT(StudentClubMember)
```

kullanılmalı,

ya da memberCount performans için tutuluyorsa her ekleme/silme transaction içinde güncellenmeli.

---

# 20. ORTA — Audit log eksik

Okul yönetim sistemi için bence en önemli eksiklerden biri bu.

Şu anda:

```text
kim öğrenci sildi?
kim devamsızlık ekledi?
kim yazılı uyarı oluşturdu?
kim belgeyi sildi?
kim WhatsApp mesajı gönderdi?
kim ayar değiştirdi?
```

gibi sorular için merkezi audit sistemi görünmüyor.

### Öneri

Yeni model:

```text
AuditLog
```

örneğin:

```text
id
userId
action
entity
entityId
oldData
newData
ip
createdAt
```

şeklinde oluşturulmalı.

Özellikle:

```text
DELETE
UPDATE
PDF üretimi
WhatsApp gönderimi
öğrenci ekleme
öğrenci pasifleştirme
```

loglanmalı.

---

# 21. ORTA — API query parametreleri yeterince doğrulanmıyor

Örneğin:

```ts
const page = parseInt(req.query.page as string) || 1;
const limit = parseInt(req.query.limit as string) || 20;
```

kullanılıyor. 

Burada:

```text
limit = 999999999
page = -500
```

gibi değerler kontrol edilmiyor.

### Öneri

Zod ile:

```ts
page: integer >= 1
limit: integer >= 1 <= 100
```

yapılmalı.

---

# 22. ORTA — TypeScript'te `any` kullanımı fazla

Örneğin:

```ts
prisma.student.findUnique as any
```

ve WhatsApp tarafında:

```ts
Baileys: any
socket: any
```

kullanılıyor. 

WhatsApp kütüphanesinin dinamik import edilmesi anlaşılabilir.

Ancak uygulamanın geri kalanında `any` azaltılmalı.

Bu özellikle:

```text
Prisma
API response
WhatsApp state
OCR sonuçları
JSON metadata
```

alanlarında type güvenliğini düşürüyor.

---

# 23. ORTA — Raw SQL kullanımı çok fazla

`initDb.ts` içerisinde:

```ts
$queryRawUnsafe()
$executeRawUnsafe()
```

çok yoğun kullanılmış. 

Buradaki sorguların önemli bölümü sabit olduğu için doğrudan SQL injection problemi olduğunu söylemiyorum.

Ancak:

```text
schema.prisma
+
migration.sql
+
initDb.ts
```

üç farklı schema kaynağı oluşması bakım maliyetini ciddi artırıyor.

Bu nedenle asıl problem:

**güvenlikten çok mimari sürdürülebilirlik.**

---

# 24. ORTA — Dosya sistemi işlemleri ile DB işlemleri atomik değil

Örneğin devamsızlık oluşturulurken:

```text
1. dosya yükleniyor
2. preview oluşturuluyor
3. OCR / gün çıkarılıyor
4. DB kaydı oluşturuluyor
```

gibi işlemler var.

Bir adım başarısız olursa:

```text
dosya var
DB kaydı yok
```

şeklinde orphan dosya oluşabilir.

Tersi de bazı senaryolarda mümkündür.

### Öneri

Bir `FileStorageService` oluşturulmalı.

Örneğin:

```text
create temporary file
↓
process
↓
DB transaction
↓
commit
↓
finalize file
```

ve hata halinde cleanup yapılmalı.

---

# 25. ORTA — PDF üretimi transaction içerisinde yapılıyor

Yazılı uyarı oluştururken transaction içerisinde PDF üretimi gerçekleştiriliyor. 

Bu mantıksal olarak çalışabilir ancak:

```text
DB transaction
      ↓
PDF oluştur
      ↓
dosya yaz
      ↓
DB INSERT
```

şeklinde transaction'ın uzun süre açık kalmasına yol açabilir.

Özellikle SQLite'da bu durum gereksiz lock süresi oluşturabilir.

### Daha iyi yapı

```text
1. gerekli DB verisini al
2. warning numarasını transaction ile ayır
3. transaction bitir
4. PDF üret
5. kaydı finalized olarak işaretle
```

veya daha basit bir `document generation state` sistemi kullanılabilir.

---

# 26. ORTA — Test altyapısı yetersiz

Backend `package.json` içinde:

```text
test
lint
```

scriptleri bulunmuyor. 

Frontend'de de:

```text
test
lint
```

yok. 

Bu kadar büyük bir sistem için artık ciddi bir eksiklik.

Özellikle test edilmesi gerekenler:

```text
auth
student CRUD
parent assignment
warning numbering
consent
WhatsApp
PDF
database migration
student delete
backup
OCR parsing
```

---

# 27. ORTA — CI/CD görünmüyor

Repository'de otomatik:

```text
build
typecheck
lint
test
security audit
```

yapan bir GitHub Actions yapısı görünmüyor.

Bu proje için en azından:

```text
push
↓
npm ci
↓
backend typecheck
↓
frontend typecheck
↓
build
↓
test
```

çalışmalı.

---

# 28. FRONTEND MİMARİ DEĞERLENDİRMESİ

Frontend genel olarak düzgün bir yapıya sahip.

React Router:

```text
/admin
/admin/students
/admin/absenteeism
/admin/warnings
...
```

şeklinde organize edilmiş. 

`ProtectedRoute` kullanılması da olumlu. 

Ancak modül sayısı artık çok fazla.

Şu anda `App.tsx` içerisinde çok sayıda doğrudan import var.

Bu büyüdükçe:

```text
App.tsx
```

bir route registry haline geliyor.

Bu büyük problem değil ancak ileride:

```text
routes/
modules/
```

şeklinde modüler routing düşünülebilir.

---

# 29. FRONTEND API KATMANI

`api.ts` içerisindeki:

```text
JWT interceptor
401 handling
retry
Tauri detection
```

yaklaşımı genel olarak iyi. 

Özellikle:

```text
502
503
504
```

retry yapılması güzel.

Ancak:

```ts
const isRetryable = !status || ...
```

ile **her status'u olmayan hatanın retry edilmesi** bazı ağ hatalarında gereksiz gecikmeye yol açabilir.

Ayrıca:

```text
POST
DELETE
```

işlemlerinde retry mantığı dikkatle ele alınmalı.

Örneğin bir POST isteği backend'de başarılı olup response kaybolursa otomatik retry:

```text
aynı kaydın iki kere oluşturulmasına
```

neden olabilir.

Bu nedenle retry yalnızca:

```text
GET
HEAD
OPTIONS
```

ve idempotent işlemler için uygulanmalı veya idempotency key kullanılmalı.

Bu önemli bir kod kalitesi iyileştirmesidir.

---

# 30. ÖĞRENCİ ARAMA MANTIĞI

Türkçe karakterler için:

```text
lower
upper
title
```

kombinasyonlarının denenmesi yaratıcı bir çözüm. 

Ancak uzun vadede bu:

```text
çok sayıda OR
```

oluşturuyor.

Daha iyi çözüm:

```text
normalizedName
normalizedClassName
```

alanları tutmak.

Örneğin:

```text
fullName = "ŞÜKRÜ YILMAZ"
searchName = "sukru yilmaz"
```

şeklinde normalize edilmiş arama alanı.

Böylece sorgular sadeleşir.

---

# 31. VERİ MODELİNE İLİŞKİN ÖNEMLİ TASARIM ÖNERİSİ

Mevcut schema artık tek bir uygulamanın sınırlarını aşmış durumda.

Şu anda aynı database:

```text
Öğrenci
Veli
Personel
Devamsızlık
Disiplin
WhatsApp
Karne
Kulüp
Komisyon
Satın alma
Gezi
Yıllık plan
Kurul
...
```

gibi birçok domain'i barındırıyor.

Bu hala tek SQLite DB içerisinde olabilir.

Ancak kod tarafında domain sınırları kesinleştirilmeli:

```text
domains/
  identity/
  students/
  attendance/
  discipline/
  communication/
  academics/
  personnel/
  administration/
  procurement/
  activities/
```

gibi.

---

# 32. MODÜL SAYISI ARTTIKÇA EN BÜYÜK RİSK

Şu anda proje giderek:

> "Devamsızlık Mektubu"

uygulamasından

> "Okul Yönetim ERP"

uygulamasına dönüşüyor.

Bu kötü değil.

Hatta bence projenin asıl potansiyeli burada.

Fakat bundan sonra özellik ekleme yöntemi:

```text
yeni sayfa
+
yeni route
+
yeni model
+
yeni service
+
yeni controller
```

şeklinde devam ederse teknik borç çok hızlı büyür.

Bundan sonra **platform mimarisi** oluşturulmalı.

---

# 33. ÖNERİLEN YENİ MİMARİ

```text
OkulDesk
│
├── Core
│   ├── Auth
│   ├── Permissions
│   ├── Audit
│   ├── Settings
│   ├── Backup
│   └── FileStorage
│
├── Students
│   ├── Students
│   ├── Parents
│   └── Classes
│
├── Attendance
│   ├── Absenteeism
│   ├── Letters
│   └── Notifications
│
├── Discipline
│   ├── Warnings
│   └── Violations
│
├── Communication
│   ├── WhatsApp
│   ├── Templates
│   └── Consent
│
├── Academic
│   └── GradeReports
│
├── Personnel
│   ├── Staff
│   ├── Duty
│   └── Transfers
│
├── Administration
│   ├── Meetings
│   ├── Commissions
│   ├── AnnualPlan
│   └── OfficialDocuments
│
├── Activities
│   ├── Clubs
│   ├── Trips
│   └── SocialActivities
│
└── Procurement
    ├── Suppliers
    ├── Procurement
    └── Orders
```

---

# 34. YENİDEN ELE ALINMASI GEREKEN 5 TEMEL SERVİS

Bence aşağıdaki servisler oluşturulursa projenin kalitesi ciddi yükselir.

## 1. FileStorageService

Tüm:

```text
PDF
JPG
PNG
OCR
preview
generated document
```

işlemleri tek yerde.

---

## 2. AuditService

Örneğin:

```ts
audit.log({
  userId,
  action: 'STUDENT_DELETE',
  entity: 'Student',
  entityId
})
```

---

## 3. BackupService

```text
manual backup
automatic backup
restore
backup verification
retention
```

---

## 4. ConsentService

WhatsApp consent mantığının tamamı burada:

```text
PENDING
ACCEPTED
DECLINED
REQUESTED
EXPIRED
```

gibi durumlar.

---

## 5. DocumentService

PDF üretimlerinin tamamı ortak altyapıdan geçmeli.

```text
DocumentService
├── generate
├── preview
├── save
├── download
├── regenerate
└── delete
```

---

# 35. VERİTABANI İÇİN ÖNERİLEN TEMEL DEĞİŞİKLİKLER

### Student

```text
status
graduationStatus
academicYear
createdAt
updatedAt
deletedAt
```

### User

```text
id
username
passwordHash
role
isActive
mustChangePassword
lastLoginAt
createdAt
updatedAt
```

### AuditLog

```text
id
userId
action
entity
entityId
metadata
createdAt
```

### FileAsset

```text
id
path
mimeType
size
sha256
entityType
entityId
createdAt
```

Böylece PDF yollarını doğrudan:

```text
pdfPath String
```

olarak her modelde tutmak yerine ortak dosya sistemi kurulabilir.

---

# 36. GÜVENLİK ÖNCELİKLERİ

Önerdiğim sıralama:

### P0

1. GitHub'daki kişisel verileri kaldır
2. Tauri backend paketleme sorununu çöz
3. WhatsApp consent mantığını düzelt
4. WhatsApp logout/auth silme davranışını düzelt
5. Veli şifre üretimini düzelt
6. rememberMe problemini düzelt

### P1

7. Audit log
8. güvenli backup
9. student hard-delete politikasını değiştir
10. upload content validation
11. CSP
12. schema/migration mimarisini tekleştir

### P2

13. Float → integer money
14. String dates → DateTime
15. JSON string azalt
16. any azalt
17. query validation
18. retry mekanizmasını idempotent hale getir

---

# 37. TEST STRATEJİSİ

Minimum:

```text
Vitest / Jest
+
Supertest
+
React Testing Library
```

kullanılabilir.

### Backend testleri

```text
Auth
├── login
├── wrong password
├── expired token
└── change password

Students
├── create
├── update
├── delete
├── parent assignment
└── duplicate school number

Attendance
├── create
├── numbering
├── file validation
└── deletion

Warnings
├── numbering
├── PDF generation
└── deletion

WhatsApp
├── consent
├── accepted
├── pending
└── declined
```

---

# 38. EN ÖNEMLİ MANTIKSAL TESTLER

Özellikle şu senaryolar otomatik test edilmeli:

### Senaryo 1

```text
Öğrenci oluştur
↓
2 veli ekle
↓
veli 1 ACCEPTED
veli 2 PENDING
↓
WhatsApp gönder
```

Beklenen:

```text
yalnızca veli 1
```

---

### Senaryo 2

```text
Öğrenci sil
```

Beklenen:

```text
öğrencinin resmi geçmişi silinmemeli
```

---

### Senaryo 3

```text
Uygulamayı kapat
↓
tekrar aç
```

Beklenen:

```text
WhatsApp tekrar QR istememeli
```

---

### Senaryo 4

```text
Yeni bilgisayar
↓
OkulDesk Setup
↓
Node.js yok
```

Beklenen:

```text
uygulama yine çalışmalı
```

Şu anki Tauri mimarisinin en kritik sınavlarından biri budur.

---

### Senaryo 5

```text
WAL aktif
↓
uygulama açık
↓
yedek al
↓
uygulama kapanır
↓
restore
```

Beklenen:

```text
son transaction dahil eksiksiz veritabanı
```

---

# 39. PROJENİN GÜÇLÜ YÖNLERİ

Sorunların yanında önemli güçlü taraflar da var.

## 1. Modüler backend

Her domain'in:

```text
routes
controller
service
```

şeklinde ayrılması doğru.

## 2. TypeScript

Backend ve frontend'in TypeScript olması uzun vadede büyük avantaj.

## 3. Prisma

SQLite üzerinde Prisma kullanılması veri erişimini düzenli hale getiriyor.

## 4. JWT

JWT + bcrypt kullanımı doğru yönde. 

## 5. Rate limiting

Login endpoint'inde özel rate limiter bulunması olumlu. 

## 6. Path traversal kontrolü

Devamsızlık PDF erişiminde:

```text
uploadBase
↓
path.resolve
↓
startsWith
```

kontrolü yapılmış. Bu güzel bir güvenlik önlemidir. 

## 7. Graceful shutdown

HTTP + WhatsApp + Prisma bağlantılarının kapatılmaya çalışılması iyi düşünülmüş. 

## 8. Frontend protected routes

Admin alanlarının `ProtectedRoute` arkasında olması doğru. 

---

# 40. SONUÇ

Ben bu projeyi şu anda:

> **"Özellik olarak oldukça gelişmiş, fakat altyapı olarak ikinci bir refactoring aşamasına girmesi gereken bir proje"**

olarak değerlendiriyorum.

Projenin artık ihtiyacı olan şey daha fazla özellik eklemekten ziyade:

```text
STABILIZATION
+
SECURITY
+
DATA INTEGRITY
+
PACKAGING
+
TESTING
```

aşamasıdır.

Özellikle bundan sonra yeni modüller eklemeden önce şu 6 konuyu çözmek çok daha doğru olur:

```text
1. Tauri + Node Sidecar
2. Prisma / initDb tekleştirme
3. WhatsApp consent
4. WhatsApp session persistence
5. Backup + Audit
6. Auth / Parent security
```

Bunlar çözüldükten sonra proje çok daha sağlam bir temel üzerine oturur.

---

# 41. ÖNCELİKLENDİRİLMİŞ YOL HARİTASI

## FAZ 1 — Acil düzeltmeler

```text
[ ] Tauri backend packaging
[ ] Node bağımlılığını kaldır
[ ] WhatsApp PENDING gönderim açığını düzelt
[ ] WhatsApp logout/session persistence düzelt
[ ] Parent password güvenli hale getir
[ ] rememberMe düzelt
[ ] GitHub'dan DB/XLS kişisel verilerini kaldır
```

## FAZ 2 — Veri güvenliği

```text
[ ] AuditLog
[ ] BackupService
[ ] Restore
[ ] FileStorageService
[ ] Student soft-delete
[ ] upload magic-byte validation
[ ] CSP
```

## FAZ 3 — Mimari

```text
[ ] Prisma migration tek kaynak
[ ] initDb sadeleştirme
[ ] JSON string azaltma
[ ] Float money kaldırma
[ ] String dates kaldırma
[ ] enum validation
[ ] any azaltma
```

## FAZ 4 — Test

```text
[ ] Unit tests
[ ] Integration tests
[ ] API tests
[ ] Auth tests
[ ] WhatsApp consent tests
[ ] DB migration tests
[ ] PDF tests
```

## FAZ 5 — Üretim

```text
[ ] GitHub Actions
[ ] automated build
[ ] automated typecheck
[ ] automated tests
[ ] release pipeline
[ ] Windows installer
[ ] versioning
[ ] backup/restore documentation
```

---

# Nihai değerlendirme

**Kod çöpe atılacak durumda değil. Kesinlikle yeniden yazılması gereken bir proje değil.**

Tam tersine, mevcut kod tabanı korunarak **iyi bir refactoring ve stabilizasyon çalışmasıyla oldukça güçlü bir okul otomasyonuna dönüşebilir.**

Benim açımdan en önemli nokta şu:

> **Bundan sonra “özellik ekleme” yerine “altyapıyı sağlamlaştırma” dönemine girilmesi gerekiyor.**

Özellikle Tauri dağıtımı, WhatsApp consent/session mantığı, veri güvenliği ve veritabanı migration yapısı düzeltilirse projenin güvenilirliği ciddi biçimde artacaktır.

**Öncelik sıram:**

**Tauri paketleme → Veri güvenliği → Auth/veli → WhatsApp → DB migration → Audit/Backup → Test altyapısı → ardından yeni özellikler.**