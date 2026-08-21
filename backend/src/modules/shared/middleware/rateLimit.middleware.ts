import rateLimit from 'express-rate-limit';

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
};

export const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
  },
});

// Normal API trafiği için makul bir üst sınır. Sağlık kontrolü de bu limiter'ın
// altında olduğundan masaüstü istemcisinin polling davranışı için yeterli pay bırakır.
export const generalLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: {
    success: false,
    message: 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.',
  },
});

// Pahalı/yoğun işlemler için ayrı limitler. Bunlar ilgili route'larda açıkça
// kullanılmalıdır; global limiter'ın yerine geçmezler.
export const uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    message: 'Çok fazla dosya yükleme isteği. Lütfen daha sonra tekrar deneyin.',
  },
});

export const expensiveOperationLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Bu işlem için istek limiti aşıldı. Lütfen daha sonra tekrar deneyin.',
  },
});
