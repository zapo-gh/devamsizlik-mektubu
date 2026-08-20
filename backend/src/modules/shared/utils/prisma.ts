import { PrismaClient } from '@prisma/client';
import { requestContext } from './asyncLocalStorage';

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const prisma = basePrisma;
// Bağlantı kopmalarında (Render uyku modu sonrası vb.) otomatik yeniden bağlan
const RECONNECT_ERRORS = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1017', // Server has closed the connection
]);

async function withReconnect<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const code: string = err?.code ?? '';
      const isReconnectable = RECONNECT_ERRORS.has(code) ||
        err?.message?.includes('connection') ||
        err?.message?.includes('ECONNRESET') ||
        err?.message?.includes('socket');
      if (isReconnectable && attempt < retries) {
        console.warn(`[Prisma] Bağlantı hatası (${code}), yeniden deneniyor (${attempt}/${retries - 1})...`);
        await basePrisma.$disconnect();
        await new Promise((r) => setTimeout(r, 500 * attempt));
        await basePrisma.$connect();
        continue;
      }
      throw err;
    }
  }
  // TypeScript için ulaşılamaz kod
  throw new Error('withReconnect: beklenmeyen durum');
}

// Prisma proxy: tüm model sorgularını withReconnect ile sar
export { withReconnect };
export default prisma;
