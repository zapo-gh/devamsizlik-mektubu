import fs from 'fs';
import path from 'path';
import prisma from '../shared/utils/prisma';

// TypeScript module:commonjs, import() → require() dönüşümünü engellemek için Function trick
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const _dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

let Baileys: any = null;
let QRCode: any = null;

export type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

interface WAState {
  status: WAStatus;
  qrBase64: string | null;
  error: string | null;
}

let socket: any | null = null;
let state: WAState = { status: 'disconnected', qrBase64: null, error: null };
let authDir: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getAuthDir(): string {
  if (authDir) return authDir;
  // Electron env üzerinden gelen yol
  if (process.env.WHATSAPP_AUTH_DIR) return process.env.WHATSAPP_AUTH_DIR;
  // Fallback
  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  return path.join(path.dirname(uploadDir), 'whatsapp-auth');
}

export function setAuthDir(dir: string) {
  authDir = dir;
}

export function getStatus(): WAState {
  return { ...state };
}

export async function initialize(): Promise<void> {
  if (state.status === 'connected' || state.status === 'connecting') return; // Zaten bağlı veya bağlanıyor

  // Node.js 18 (Electron 28) polyfill: globalThis.crypto Node.js 19'da global oldu
  if (!globalThis.crypto) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require('crypto');
    (globalThis as any).crypto = nodeCrypto.webcrypto;
  }

  // ESM modüllerini dinamik olarak yükle (TypeScript require() dönüşümünü atlatmak için Function trick)
  if (!Baileys) {
    Baileys = await _dynamicImport('@whiskeysockets/baileys');
  }
  if (!QRCode) {
    QRCode = await _dynamicImport('qrcode');
  }

  const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestWaWebVersion, makeCacheableSignalKeyStore, Browsers } = Baileys as any;

  const dir = getAuthDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const { default: pino } = await _dynamicImport('pino');
  const logger = pino({ level: 'silent' });
  const { state: authState, saveCreds } = await useMultiFileAuthState(dir);

  // fetchLatestWaWebVersion → WhatsApp'ın kendi sunucusundan güncel versiyon çeker
  let version: number[];
  try {
    const result = await fetchLatestWaWebVersion();
    version = result.version;
    console.log(`📱 WhatsApp Web versiyonu: ${version}`);
  } catch {
    version = [2, 3000, 1027934701]; // fallback
    console.log(`⚠️ Versiyon çekilemedi, fallback kullanılıyor: ${version}`);
  }

  state = { status: 'connecting', qrBase64: null, error: null };

  socket = makeWASocket({
    version,
    logger,
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, logger),
    },
    printQRInTerminal: false,
    browser: Browsers ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '20.0.04'],
    keepAliveIntervalMs: 20000,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  socket.ev.on('creds.update', saveCreds);

  socket.ev.on('messages.upsert', async (m: any) => {
    try {
      for (const msg of m.messages) {
        if (!msg.message || msg.key.fromMe) continue;
        
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) continue;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.buttonsResponseMessage?.selectedDisplayText || '';
        if (!text) continue;

        const phone = remoteJid.split('@')[0];
        let cleanPhone = phone;
        if (cleanPhone.startsWith('90')) cleanPhone = cleanPhone.slice(2);

        const upperText = text.trim().toLocaleUpperCase('tr-TR');
        
        let newStatus: 'ACCEPTED' | 'DECLINED' | null = null;
        if (['EVET', 'KABUL', '1'].includes(upperText) || upperText === 'ONAYLIYORUM') {
          newStatus = 'ACCEPTED';
        } else if (['HAYIR', 'IPTAL', 'İPTAL', 'RET', '2'].includes(upperText) || upperText === 'REDDEDİYORUM' || upperText === 'REDDEDIYORUM') {
          newStatus = 'DECLINED';
        }

        if (newStatus) {
          const parents = await prisma.parent.findMany();
          const parent = parents.find((p: any) => {
            const pPhone = p.phone.replace(/\D/g, '');
            return pPhone.endsWith(cleanPhone) || cleanPhone.endsWith(pPhone);
          });

          if (parent) {
            await prisma.parent.update({
              where: { id: parent.id },
              data: {
                waConsentStatus: newStatus,
                waConsentDate: new Date()
              }
            });

            const replyText = newStatus === 'ACCEPTED'
              ? '✅ Okul bilgilendirme mesajları için onayınız alınmıştır. Teşekkür ederiz.'
              : '❌ Okul bilgilendirme mesajlarını almayı reddettiniz. Size artık WhatsApp üzerinden okul bilgilendirmeleri gönderilmeyecektir.';

            if (socket) {
              await socket.sendMessage(remoteJid, { text: replyText });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error handling incoming WhatsApp message:', error);
    }
  });

  socket.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const base64 = await (QRCode as any).toDataURL(qr);
      state = { status: 'qr', qrBase64: base64, error: null };
      console.log('📱 WhatsApp QR kodu hazır');
    }

    if (connection === 'open') {
      state = { status: 'connected', qrBase64: null, error: null };
      console.log('✅ WhatsApp bağlantısı kuruldu');
    }

    if (connection === 'close') {
      socket = null;
      const { Boom } = await _dynamicImport('@hapi/boom');
      const reason = (lastDisconnect?.error instanceof Boom)
        ? (lastDisconnect.error as any).output?.statusCode
        : undefined;
      console.log(`🔌 WA bağlantı kapandı. reason=${reason} error=${lastDisconnect?.error?.message}`);
      const shouldReconnect = reason !== DisconnectReason.loggedOut;

      if (reason === DisconnectReason.loggedOut) {
        try { fs.rmSync(getAuthDir(), { recursive: true, force: true }); } catch { /* ignore */ }
        state = { status: 'disconnected', qrBase64: null, error: 'Oturum kapatıldı.' };
        console.log('🔴 WhatsApp oturumu kapatıldı');
      } else if (shouldReconnect) {
        state = { status: 'connecting', qrBase64: null, error: null };
        console.log('🔄 WhatsApp yeniden bağlanıyor...');
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => { socket = null; initialize(); }, 5000);
      } else {
        state = { status: 'disconnected', qrBase64: null, error: null };
        console.log(`🔴 WhatsApp bağlantı kesildi (reason=${reason}, yeniden bağlanmıyor)`);
      }
    }
  });
}

export async function disconnect(clearAuth: boolean = false): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    if (clearAuth) {
      await socket.logout();
    } else {
      socket.end(undefined); // Close connection gracefully without logging out
    }
    socket = null;
  }
  
  if (clearAuth) {
    try {
      fs.rmSync(getAuthDir(), { recursive: true, force: true });
    } catch { /* ignore */ }
  }
  state = { status: 'disconnected', qrBase64: null, error: null };
}

/** Telefon numarasını WhatsApp JID formatına çevirir */
function toJid(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('00')) clean = clean.slice(2);
  if (clean.startsWith('0')) clean = '90' + clean.slice(1);
  if (!clean.startsWith('90') && clean.length === 10) clean = '90' + clean;
  return `${clean}@s.whatsapp.net`;
}

async function checkConsent(phone: string): Promise<void> {
  const cleanPhone = phone.replace(/\D/g, '');
  const parents = await prisma.parent.findMany();
  const parent = parents.find((p: any) => {
    const pPhone = p.phone.replace(/\D/g, '');
    return pPhone.endsWith(cleanPhone) || cleanPhone.endsWith(pPhone);
  });

  if (!parent) {
    throw new Error('İlgili telefon numarasına ait veli kaydı bulunamadı.');
  }

  if (parent.waConsentStatus !== 'ACCEPTED') {
    throw new Error('Veli WhatsApp bildirimlerini açıkça onaylamadığı için (Durum: ' + (parent.waConsentStatus || 'Bekliyor') + ') mesaj gönderilemedi.');
  }
}

export async function sendConsentRequest(phone: string): Promise<void> {
  if (!socket || state.status !== 'connected') {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  const jid = toJid(phone);
  const text = `Sayın Veli, OkulDesk sistemi üzerinden devamsızlık ve okul bilgilendirmelerini WhatsApp üzerinden almak istiyorsanız lütfen bu mesaja EVET veya 1 yazarak cevap veriniz. İstemiyorsanız HAYIR veya 2 yazabilirsiniz.`;
  await socket.sendMessage(jid, { text });
}

export async function sendTextMessage(phone: string, text: string): Promise<void> {
  if (!socket || state.status !== 'connected') {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  await checkConsent(phone);
  const jid = toJid(phone);
  await socket.sendMessage(jid, { text });
}

export async function sendMessageWithPDF(
  phone: string,
  text: string,
  pdfPath: string,
  fileName = 'belge.pdf'
): Promise<void> {
  if (!socket || state.status !== 'connected') {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  if (!fs.existsSync(pdfPath)) {
    throw new Error('PDF dosyası bulunamadı.');
  }
  await checkConsent(phone);
  const jid = toJid(phone);
  const document = fs.readFileSync(pdfPath);
  await socket.sendMessage(jid, {
    document,
    fileName,
    mimetype: 'application/pdf',
    caption: text,
  });
}

export async function sendMessageWithImage(
  phone: string,
  text: string,
  imagePath: string
): Promise<void> {
  if (!socket || state.status !== 'connected') {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error('Görsel dosyası bulunamadı.');
  }
  await checkConsent(phone);
  const jid = toJid(phone);
  const image = fs.readFileSync(imagePath);
  await socket.sendMessage(jid, {
    image,
    caption: text,
    mimetype: 'image/jpeg',
  });
}

export async function sendMessageWithImageBuffer(
  phone: string,
  text: string,
  imageBuffer: Buffer
): Promise<void> {
  if (!socket || state.status !== 'connected') {
    throw new Error('WhatsApp bağlı değil. Lütfen önce QR kodu okutun.');
  }
  await checkConsent(phone);
  const jid = toJid(phone);
  await socket.sendMessage(jid, {
    image: imageBuffer,
    caption: text,
    mimetype: 'image/jpeg',
  });
}

export const whatsappService = {
  initialize,
  disconnect,
  getStatus,
  setAuthDir,
  sendTextMessage,
  sendConsentRequest,
  sendMessageWithPDF,
  sendMessageWithImage,
  sendMessageWithImageBuffer,
};
