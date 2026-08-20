import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from './errorHandler.middleware';
import { requestContext } from '../utils/asyncLocalStorage';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'PARENT';
  mustChangePassword?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Yetkilendirme başarısız. Token bulunamadı.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    
    if (decoded.mustChangePassword) {
      const allowedPaths = ['/auth/change-password', '/auth/profile', '/auth/logout'];
      // Exact match or if the current request URL starts with one of the allowed paths
      // Typically req.originalUrl is used, but req.path is fine since the router handles prefixes
      // req.originalUrl could be /api/auth/change-password
      const isAllowed = allowedPaths.some(p => req.originalUrl.includes(p));
      if (!isAllowed) {
        throw new AppError('Lütfen devam etmeden önce varsayılan şifrenizi değiştirin.', 403);
      }
    }

    req.user = decoded;
    
    // Set global context for Prisma Audit Extension
    requestContext.run({ userId: decoded.userId, role: decoded.role }, () => {
      next();
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Geçersiz veya süresi dolmuş token.', 401));
  }
};

export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Bu işlem için yönetici yetkisi gereklidir.', 403));
  }
  next();
};
