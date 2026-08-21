import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class AuthService {
  async setupStatus() {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    return { setupRequired: adminCount === 0 };
  }

  async initializeAdmin(username: string, password: string) {
    const existingAdmin = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (existingAdmin > 0) {
      throw new AppError('İlk kurulum zaten tamamlanmış.', 409);
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new AppError('Bu kullanıcı adı zaten kullanılıyor.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'ADMIN',
        mustChangePassword: false,
      },
      select: { id: true, username: true, role: true, mustChangePassword: true },
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role, mustChangePassword: user.mustChangePassword },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions,
    );

    return { token, user };
  }

  async login(username: string, password: string, rememberMe = false) {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      throw new AppError('Geçersiz kullanıcı adı veya şifre.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError('Geçersiz kullanıcı adı veya şifre.', 401);
    }

    const expiresIn = rememberMe ? '30d' : config.jwt.expiresIn;
    const token = jwt.sign(
      { userId: user.id, role: user.role, mustChangePassword: user.mustChangePassword },
      config.jwt.secret,
      { expiresIn } as jwt.SignOptions,
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
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
      data: { password: hashedPassword, mustChangePassword: false },
    });

    // İlk kurulumda oluşturulan geçici credential dosyasını otomatik temizle.
    if (user.mustChangePassword && user.role === 'ADMIN') {
      const userDataPath = path.resolve(
        process.env.APPDATA || path.join(process.env.USERPROFILE || '.', 'AppData', 'Roaming'),
        'OkulDesk',
      );
      const credentialsFile = path.join(userDataPath, 'initial-admin-credentials.txt');
      try {
        fs.rmSync(credentialsFile, { force: true });
      } catch {
        // Şifre değişikliğini credential dosyasının silinmesine bağımlı hale getirme.
      }
    }

    return { message: 'Şifre başarıyla güncellendi.' };
  }
}

export const authService = new AuthService();
