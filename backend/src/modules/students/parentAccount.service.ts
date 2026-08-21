import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

/** Canonical Turkish mobile number representation: 05XXXXXXXXX. */
export function normalizeParentPhone(phone: string): string {
  const cleaned = String(phone ?? '').replace(/[^0-9+]/g, '');
  let normalized = cleaned;
  if (normalized.startsWith('+90')) normalized = `0${normalized.slice(3)}`;
  else if (normalized.startsWith('90') && normalized.length === 12) normalized = `0${normalized.slice(2)}`;
  else if (normalized.length === 10 && normalized.startsWith('5')) normalized = `0${normalized}`;
  if (!/^05\d{9}$/.test(normalized)) throw new AppError('Geçerli bir Türkiye cep telefonu numarası girilmelidir.', 400);
  return normalized;
}

export function generateParentTemporaryPassword(): string {
  return crypto.randomBytes(12).toString('base64url');
}

export class ParentAccountService {
  async resetPassword(parentId: string, actorUserId: string) {
    const parent = await prisma.parent.findUnique({ where: { id: parentId }, include: { user: true } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);
    if (parent.user.role !== 'PARENT') throw new AppError('Bu hesap veli hesabı değil.', 400);

    const temporaryPassword = generateParentTemporaryPassword();
    const password = await bcrypt.hash(temporaryPassword, 12);
    await prisma.user.update({ where: { id: parent.user.id }, data: { password, mustChangePassword: true } });

    const { AuditService } = require('../shared/utils/audit.service');
    await AuditService.log(actorUserId, 'RESET_PARENT_PASSWORD', 'Parent', parentId, { phone: parent.phone });
    return { parentId, phone: parent.phone, temporaryPassword, mustChangePassword: true };
  }

  async findByPhone(phone: string) {
    const normalized = normalizeParentPhone(phone);
    return prisma.parent.findFirst({ where: { phone: normalized }, include: { user: true } });
  }
}

export const parentAccountService = new ParentAccountService();
