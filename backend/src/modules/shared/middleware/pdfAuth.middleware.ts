import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../utils/prisma';
import { AppError } from './errorHandler.middleware';
import { JwtPayload } from './auth.middleware';

/**
 * Middleware that allows PDF access for:
 * 1. Admin users with valid JWT Bearer token (header or ?jwt= query param)
 * 2. Parents with a valid OTP token query parameter (?token=xxx)
 */
export const pdfAuthMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const absenteeismId = req.params.id;

    // Option 1: Check for JWT Bearer token in header (admin)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        if (decoded.role === 'ADMIN') {
          req.user = decoded;
          return next();
        }
      } catch {
        // JWT invalid, continue to check other methods
      }
    }

    // Option 2: Check for JWT in query parameter (admin - for <a href> links)
    const jwtToken = req.query.jwt as string;
    if (jwtToken) {
      try {
        const decoded = jwt.verify(jwtToken, config.jwt.secret) as JwtPayload;
        if (decoded.role === 'ADMIN') {
          req.user = decoded;
          return next();
        }
      } catch {
        // JWT invalid, continue to check OTP token
      }
    }

    // Option 3: Check for OTP token in query parameter (parent)
    const otpToken = req.query.token as string;
    if (otpToken) {
      const otp: any = await (prisma.oTP.findUnique as any)({
        where: { token: otpToken },
      });

      if (otp && otp.absenteeismId === absenteeismId && otp.expiresAt > new Date()) {
        return next();
      }
    }

    throw new AppError('Bu dosyaya erişim yetkiniz yok.', 403);
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(new AppError('Bu dosyaya erişim yetkiniz yok.', 403));
  }
};
