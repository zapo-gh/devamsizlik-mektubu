import { PrismaClient } from '@prisma/client';
import { requestContext } from './asyncLocalStorage';

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        // Asıl işlemi çalıştır
        const result = await query(args);

        // Mutasyon operasyonları
        const mutationOps = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany', 'upsert'];
        
        if (mutationOps.includes(operation) && model !== 'AuditLog') {
          const context = requestContext.getStore();
          const userId = context?.userId || 'SYSTEM'; // Cron vb. için SYSTEM fallback

          let entityId = 'bulk_operation';
          if (result && typeof result === 'object' && 'id' in result) {
            entityId = String((result as any).id);
          } else if (args && (args as any).where && 'id' in (args as any).where) {
            entityId = String((args as any).where.id);
          }

          // Arka planda Audit Log ekle (await etmiyoruz ki asıl işlemi geciktirmesin)
          // Fakat Prisma $extends içindeyken asenkron fire-and-forget bazen bağlantı kapanırsa hata verir
          // Güvenli olması için try-catch
          basePrisma.auditLog.create({
            data: {
              userId,
              action: `${operation.toUpperCase()}_${model.toUpperCase()}`,
              entity: model,
              entityId,
              metadata: JSON.stringify(args)
            }
          }).catch(err => {
            console.error('⚠️ Otomatik AuditLog yazılamadı:', err);
          });
        }

        return result;
      }
    }
  }
});

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
