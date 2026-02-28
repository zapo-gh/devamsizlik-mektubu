import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class AuthService {
  async login(username: string, password: string) {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      throw new AppError('Geçersiz kullanıcı adı veya şifre.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Geçersiz kullanıcı adı veya şifre.', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    return user;
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw new AppError('Mevcut şifre yanlış.', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Şifre başarıyla güncellendi.' };
  }
}

export const authService = new AuthService();
