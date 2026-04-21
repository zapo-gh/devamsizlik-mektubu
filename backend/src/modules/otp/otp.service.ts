import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class OtpService {
  /**
   * Generate a 4-digit OTP
   */
  generateOtpCode(): string {
    return crypto.randomInt(1000, 9999).toString();
  }

  /**
   * Hash OTP code using bcrypt
   */
  async hashOtp(code: string): Promise<string> {
    return bcrypt.hash(code, 10);
  }

  /**
   * Create OTP for an absenteeism record
   */
  async createOtp(absenteeismId: string, parentPhone: string) {
    // Verify absenteeism exists
    const absenteeism = await prisma.absenteeism.findUnique({
      where: { id: absenteeismId },
    });
    if (!absenteeism) {
      throw new AppError('Devamsızlık kaydı bulunamadı.', 404);
    }

    // Invalidate any existing unused OTPs for this absenteeism + phone
    await prisma.oTP.updateMany({
      where: {
        absenteeismId,
        parentPhone,
        isUsed: false,
      },
      data: { isUsed: true },
    });

    // Generate and hash OTP
    const plainCode = this.generateOtpCode();
    const codeHash = await this.hashOtp(plainCode);
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);

    // Create OTP record with short unique token (8 chars)
    const token = crypto.randomBytes(4).toString('hex');
    await (prisma.oTP.create as any)({
      data: {
        absenteeismId,
        parentPhone,
        codeHash,
        token,
        expiresAt,
      },
    });

    return {
      code: plainCode,
      expiresAt,
      parentPhone,
      token,
    };
  }

  /**
   * Verify OTP code using unique token (no phone needed)
   */
  async verifyOtpByToken(token: string, code: string) {
    const otp: any = await (prisma.oTP.findUnique as any)({
      where: { token },
      include: {
        absenteeism: {
          include: {
            student: {
              select: { fullName: true, className: true, schoolNumber: true },
            },
          },
        },
      },
    });

    if (!otp || otp.expiresAt <= new Date()) {
      throw new AppError('Bu bağlantının süresi dolmuş.', 401);
    }

    if (otp.attemptCount >= config.otp.maxAttempts) {
      throw new AppError(
        'Çok fazla hatalı deneme. Lütfen okul idaresinden yeni link talep edin.',
        429
      );
    }

    const isValid = await bcrypt.compare(code, otp.codeHash);

    if (!isValid) {
      await prisma.oTP.update({
        where: { id: otp.id },
        data: { attemptCount: { increment: 1 } },
      });

      const remaining = config.otp.maxAttempts - otp.attemptCount - 1;
      throw new AppError(
        `Geçersiz şifre. ${remaining} deneme hakkınız kaldı.`,
        401
      );
    }

    await prisma.absenteeism.update({
      where: { id: otp.absenteeismId },
      data: { viewedByParent: true },
    });

    return {
      absenteeism: otp.absenteeism,
    };
  }

  /**
   * Get OTP info by token (for displaying status on page)
   */
  async getOtpInfoByToken(token: string) {
    const otp: any = await (prisma.oTP.findUnique as any)({
      where: { token },
      include: {
        absenteeism: {
          include: {
            student: {
              select: { fullName: true, className: true },
            },
          },
        },
      },
    });

    if (!otp) {
      throw new AppError('Geçersiz bağlantı.', 404);
    }

    return {
      isExpired: otp.expiresAt <= new Date(),
      isUsed: otp.isUsed,
      studentName: otp.absenteeism.student.fullName,
      className: otp.absenteeism.student.className,
    };
  }
}

export const otpService = new OtpService();
