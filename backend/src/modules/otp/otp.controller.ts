import { Request, Response, NextFunction } from 'express';
import { otpService } from './otp.service';
import { z } from 'zod';
import { AppError } from '../shared/middleware/errorHandler.middleware';

const verifyByTokenSchema = z.object({
  token: z.string().min(1, 'Geçersiz bağlantı.'),
  code: z.string().length(4, 'OTP 4 haneli olmalıdır.'),
});

export class OtpController {
  async verifyByToken(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = verifyByTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(parsed.error.errors[0].message, 400);
      }

      const result = await otpService.verifyOtpByToken(parsed.data.token, parsed.data.code);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getTokenInfo(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.params;
      if (!token) {
        throw new AppError('Token gerekli.', 400);
      }
      const result = await otpService.getOtpInfoByToken(token);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const otpController = new OtpController();
