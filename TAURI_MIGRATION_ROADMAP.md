# OkulDesk - Tauri v2 + Node.js Sidecar Mimari Geçiş Rehberi (Roadmap)

Bu kılavuz, `OkulDesk` (Devamsızlık Mektubu) projesinin mevcut **Electron + Chromium** masaüstü kabuğundan referans proje (`pansiyon-tauri`) gibi hafif ve hızlı **Tauri v2** mimarisine geçilmesi için izlenecek teknik adımları açıklar.

---

## 1. Neden "Tauri v2 + Node.js Sidecar" Mimarisi?

1. **Kurulum Boyutunda %90 İyileşme**:
   - Electron, uygulamanın içine tam bir Chromium tarayıcısı (~150-200 MB) gömer.
   - Tauri v2, Windows'taki yerleşik **WebView2** (Microsoft Edge Chromium engine) sistemini kullandığı için uygulamanızın exe boyutu **~10-15 MB** civarına iner.
2. **RAM ve Sistem Kaynağı Tüketiminde Yarı Yarıya Düşüş**:
   - Electron açılışı ~250–400 MB RAM kullanırken, Tauri ~30–50 MB kabuk RAM tüketimiyle çalışır.
3. **Mevcut Node.js Arka Planının (`backend/`) Korunması**:
   - Projemizde **Tesseract OCR (`tesseract.js`)**, **WhatsApp Baileys (`@whiskeysockets/baileys`)**, **XLSX** ve **PDFKit** gibi Node.js ekosistemine bağlı çok önemli iş mantıkları vardır.
   - Tüm bunları sıfırdan Rust diline çevirmek yerine, mevcut Express backendimiz **Tauri Sidecar** (Arka planda çalışan alt işlem) olarak başlatılarak **%100 uyumlu** şekilde çalışmaya devam eder.

---

## 2. Mimari Karşılaştırma Şeması

```
+-------------------------------------------------------------+
|                     MEVCUT ELECTRON MİMARİSİ                 |
|  [Chromium Browser Engine] + [Node.js Runtime] (~180 MB)    |
|       |                                        |            |
|       +--> UI (React/Vite)                     +--> Express |
+-------------------------------------------------------------+

                              ↓↓↓

+-------------------------------------------------------------+
|                  HEDEF TAURI v2 + SIDECAR MİMARİSİ           |
|         [Tauri v2 Shell / OS WebView2] (~15 MB exe)         |
|       |                                        |            |
|       +--> UI (React/Vite)                     +--> Sidecar |
|            (Hafif ve Anlık Render)                  (Node.js|
|                                                      Express)
+-------------------------------------------------------------+
```

---

## 3. Uygulama Adımları (Adım Adım Geçiş Planı)

### Adım 1: Tauri v2 Proje Altyapısının Kurulması
Proje kök dizininde Tauri v2 altyapısını başlatın:
```bash
npx @tauri-apps/cli@latest init
```
- Bu komut projenizde `src-tauri` klasörü ve `tauri.conf.json` dosyası oluşturacaktır.
- `tauri.conf.json` içindeki `build.beforeDevCommand` ayarını `"npm run dev:frontend"` ve `build.devUrl` ayarını React Vite portunuz olarak (`"http://localhost:5173"`) ayarlayın.

### Adım 2: Node.js Backend'in Tekil Çalıştırılabilir (Binary/Pkg) Haline Getirilmesi veya Sidecar Olarak Tanımlanması
Tauri v2, harici bir binary (sidecar) çalıştırabilir. Mevcut `backend/dist/server.js` dosyamızı Node.js runtime ile başlatmak için `src-tauri/tauri.conf.json` dosyasında şu tanımlama yapılır:

```json
{
  "bundle": {
    "externalBin": ["binaries/okuldesk-backend"]
  }
}
```
*Not: Alternatif olarak Tauri Rust kodu (`lib.rs`), sistemdeki Node.js veya gömülü Node runtime üzerinden `backend/dist/server.js` dosyasını `std::process::Command` ile arkaplanda başlatabilir.*

### Adım 3: Rust (`src-tauri/src/lib.rs`) İçinde Arka Plan Sunucusunun Başlatılması
`lib.rs` içinde uygulama açılırken arka plan servisinin dinlemeye başlaması için:
```rust
use tauri_plugin_shell::ShellExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Node.js arka plan servisini başlat
            let _sidecar = app.shell().sidecar("okuldesk-backend")?.spawn()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("OkulDesk Tauri başlatılamadı");
}
```

### Adım 4: Frontend Yapılandırması ve Test
Frontend uygulamasındaki API istekleri (`services/api.ts`) zaten `http://127.0.0.1:4000` adresine yöneldiği için **hiçbir React veya API kodu değiştirilmeden** doğrudan çalışır!

```bash
# Geliştirme modunda test etmek için:
npm run tauri dev

# Prodüksiyon (.exe installer) derlemesi almak için:
npm run tauri build
```

---

## 4. Özet Kazanımlar Tablosu

| Metrik | Electron Mimarisi (Mevcut) | Tauri v2 + Sidecar (Hedef) |
| :--- | :--- | :--- |
| **Kurulum Boyutu (.exe)** | ~160 MB | **~15 - 20 MB** |
| **Boşta RAM Tüketimi** | ~250 MB | **~45 MB** |
| **Uygulama Açılış Süresi** | ~3 saniye | **~0.5 saniye** |
| **Kod Değişikliği İhtiyacı** | - | **Sadece Kabuk (Backend mantığı %100 aynı kalır)** |
