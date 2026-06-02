import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const loginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı gereklidir.'),
  password: z.string().min(1, 'Şifre gereklidir.'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gereklidir.'),
  newPassword: z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır.'),
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const rememberMe = req.body.rememberMe === true;
      const result = await authService.login(parsed.data.username, parsed.data.password, rememberMe);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.getProfile(req.user!.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await authService.changePassword(
        req.user!.userId,
        parsed.data.currentPassword,
        parsed.data.newPassword
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
