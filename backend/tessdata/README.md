# Tesseract Dil Dosyaları

Bu klasör, Electron uygulamasının offline çalışabilmesi için Tesseract OCR dil
verilerini içermelidir. Uygulama paketlendiğinde bu klasör `extraResources`
kapsamında `resources/backend/tessdata/` altına kopyalanır.

## Gerekli Dosyalar

- `tur.traineddata` — Türkçe dil modeli

## İndirme

```
https://github.com/tesseract-ocr/tessdata/raw/main/tur.traineddata
```

Dosyayı bu klasöre (`backend/tessdata/tur.traineddata`) yerleştirin, ardından
uygulamayı derleyin.

## Neden Burada?

`tesseract.js`, dil verilerini varsayılan olarak CDN'den indirir. Electron
`asar` paketi içinde ağ erişimi olmayabileceğinden veya kurumsal ağlarda
engellenebileceğinden, dosyanın uygulama paketiyle birlikte dağıtılması
gerekir.

`ocr.service.ts` → `process.env.TESSDATA_PATH` değişkeni ile bu konumu kullanır.
`electron/main.js` → `app.isPackaged` olduğunda `TESSDATA_PATH` bu klasöre işaret eder.
