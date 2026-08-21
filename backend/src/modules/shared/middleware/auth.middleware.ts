import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
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

export const authMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Yetkilendirme başarısız. Token bulunamadı.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // mustChangePassword is persisted in the database. Do not rely solely on
    // the JWT claim because the claim is intentionally immutable until token
    // expiry and would otherwise keep a user locked out after a successful
    // password change.
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true, mustChangePassword: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 401);
    }

    if (user.mustChangePassword) {
      const allowedPaths = ['/auth/change-password', '/auth/profile', '/auth/logout'];
      const isAllowed = allowedPaths.some((p) => req.originalUrl.includes(p));
      if (!isAllowed) {
        throw new AppError('Lütfen devam etmeden önce varsayılan şifrenizi değiştirin.', 403);
      }
    }

    // Use the database role as the authoritative value so a role change takes
    // effect immediately without waiting for the old JWT to expire.
    req.user = {
      userId: decoded.userId,
      role: user.role as JwtPayload['role'],
      mustChangePassword: user.mustChangePassword,
    };

    requestContext.run({ userId: decoded.userId, role: user.role }, () => {
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
