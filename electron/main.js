'use strict';

const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// EPIPE ve benzeri kırık boru hatalarını sessizce yut
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.code === 'ECONNRESET') return;
  try { console.error('Uncaught exception:', err); } catch {}
});

// Promise rejection'larını yakala — logla ama uygulamayı çökertme
process.on('unhandledRejection', (reason) => {
  try { console.error('Unhandled rejection:', reason); } catch {}
});

// Windows'ta console.log çağrıları CMD penceresi açmasın —
// tüm çıktıyı log dosyasına yönlendir
function redirectConsoleToFile() {
  const logPath = path.join(app.getPath('userData'), 'app.log');
  try {
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    const ts = () => new Date().toISOString().slice(11, 19);
    const write = (prefix, args) => {
      try { logStream.write(`[${ts()}] ${prefix}${args.map(String).join(' ')}\n`); } catch {}
    };
    console.log   = (...a) => write('', a);
    console.info  = (...a) => write('INFO  ', a);
    console.warn  = (...a) => write('WARN  ', a);
    console.error = (...a) => write('ERROR ', a);
    console.debug = (...a) => write('DEBUG ', a);
  } catch {
    // log dosyası açılamazsa en azından konsolu boşa düşür
    const noop = () => {};
    console.log = console.info = console.warn = console.error = console.debug = noop;
  }
}

// app hazır olmadan önce çağrılmalı
redirectConsoleToFile();

// Windows görev çubuğu ve başlat menüsü ikonu için AppUserModelId ayarla
if (process.platform === 'win32') {
  app.setAppUserModelId('com.okuldesk.app');
}

let mainWindow = null;

// ── Tek instance kilidi ─────────────────────────────────────────────────────
// Uygulama zaten açıksa ikinci örneği kapat, mevcutu öne getir
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ── JWT secret: ilk çalıştırmada rastgele üret, userData'ya kaydet ─────────
function getOrCreateJwtSecret(userDataPath) {
  const secretFile = path.join(userDataPath, '.jwt_secret');
  try {
    if (fs.existsSync(secretFile)) {
      const secret = fs.readFileSync(secretFile, 'utf8').trim();
      if (secret && secret.length >= 32) return secret;
    }
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  } catch {
    // Dosya yazılamazsa bellekte rastgele üret (uygulama yeniden başlatılınca oturumlar geçersiz olur)
    return crypto.randomBytes(48).toString('hex');
  }
}

// ── Ortam değişkenlerini ayarla ─────────────────────────────────────────────
function setupEnv() {
  const userDataPath = app.getPath('userData');
  // Windows'ta backslash yerine forward slash kullan (Prisma SQLite URL)
  const dbPath = path.join(userDataPath, 'database.db').replace(/\\/g, '/');
  const uploadsDir = path.join(userDataPath, 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  process.env.NODE_ENV = 'production';
  process.env.PORT = '4000';
  process.env.DATABASE_URL = `file:${dbPath}`;
  process.env.JWT_SECRET = getOrCreateJwtSecret(userDataPath);
  process.env.JWT_EXPIRES_IN = '24h';
  process.env.CORS_ORIGIN = 'http://127.0.0.1:4000';
  process.env.UPLOAD_DIR = uploadsDir;
  process.env.WHATSAPP_AUTH_DIR = path.join(userDataPath, 'whatsapp-auth');
  process.env.OTP_EXPIRY_MINUTES = '30';
  process.env.OTP_MAX_ATTEMPTS = '3';

  // Prisma query engine binary yolu (extraResources altında)
  if (app.isPackaged) {
    const resourcesModules = path.join(
      process.resourcesPath,
      'backend',
      'node_modules'
    );
    const enginePath = findPrismaEngine(resourcesModules);
    if (enginePath) {
      process.env.PRISMA_QUERY_ENGINE_LIBRARY = enginePath;
    }
  }

  // Tesseract dil dosyalarının offline bulunduğu dizin (extraResources/backend/tessdata)
  if (app.isPackaged) {
    process.env.TESSDATA_PATH = path.join(process.resourcesPath, 'backend', 'tessdata');
  }
}

function findPrismaEngine(nodeModulesPath) {
  const prismaClientDir = path.join(nodeModulesPath, '.prisma', 'client');
  if (!fs.existsSync(prismaClientDir)) return undefined;
  const files = fs.readdirSync(prismaClientDir);
  const engineFile = files.find(
    (f) => f.startsWith('libquery_engine') && (f.endsWith('.node') || f.endsWith('.dll.node'))
  );
  return engineFile ? path.join(prismaClientDir, engineFile) : undefined;
}

// ── Backend'i başlat ────────────────────────────────────────────────────────
async function startBackend() {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'server.js')
    : path.join(__dirname, '..', 'backend', 'dist', 'server.js');

  if (!fs.existsSync(serverPath)) {
    throw new Error(
      `Backend derlenmemiş.\nBeklenen konum: ${serverPath}\n\n` +
      'Lütfen önce "npm run build:backend" komutunu çalıştırın.'
    );
  }

  const { startServer } = require(serverPath);

  if (typeof startServer !== 'function') {
    throw new Error('server.js içinde startServer() fonksiyonu bulunamadı.');
  }

  // İlk çalıştırmada oluşturulan admin şifresini yakala
  process.once('adminInitialized', (password) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'İlk Kurulum — Yönetici Şifresi',
      message: 'Yönetici hesabı oluşturuldu.',
      detail:
        `Kullanıcı adı: admin\nŞifre: ${password}\n\n` +
        'Bu şifreyi güvenli bir yere not edin.\nGiriş yaptıktan sonra şifrenizi değiştirmeniz önerilir.',
      buttons: ['Tamam'],
      noLink: true,
    });
  });

  // startServer() resolve edince sunucu dinlemeye hazırdır
  await startServer();
  console.log('✅ Backend yüklendi ve dinlemede');
}

// ── Pencere oluştur ──────────────────────────────────────────────────────────
function createWindow() {
  const iconFile = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const iconPath = path.join(__dirname, '..', 'assets', iconFile);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'OkulDesk',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL('http://127.0.0.1:4000');

  // Dış linkleri (wa.me, http(s) dışı veya farklı origin) sistem tarayıcısında aç
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // blob: URL'leri (PDF görüntüleme) Electron içinde yeni pencerede aç
    if (url.startsWith('blob:')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 900,
          height: 700,
          title: 'PDF Görüntüle',
          webPreferences: { plugins: true },
        },
      };
    }
    if (!url.startsWith('http://127.0.0.1:4000')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Renderer içindeki <a target="_blank"> veya window.location değişikliklerini yakala
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://127.0.0.1:4000')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── Uygulama akışı ───────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  setupEnv();

  try {
    // Port kullanımdaysa mevcut sunucu zaten çalışıyor olabilir; kontrol et
    const http = require('http');
    const alreadyRunning = await new Promise((resolve) => {
      const req = http.get('http://127.0.0.1:4000/api/settings', (res) => {
        resolve(res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => { req.destroy(); resolve(false); });
    });

    if (!alreadyRunning) {
      await startBackend();
    }
    createWindow();
  } catch (err) {
    console.error('❌ Başlatma hatası:', err);
    dialog.showErrorBox('Başlatma Hatası', String(err));
    app.quit();
  }
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
