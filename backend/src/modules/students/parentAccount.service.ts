import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../shared/utils/prisma';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export type ParentDbClient = typeof prisma | Prisma.TransactionClient;

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
  async ensureParent(
    db: ParentDbClient,
    input: { fullName: string; phone: string },
  ): Promise<{ parent: { id: string; userId: string; fullName: string; phone: string }; temporaryPassword: string | null; isNewUser: boolean }> {
    const phone = normalizeParentPhone(input.phone);
    const fullName = input.fullName.trim();
    if (!fullName) throw new AppError('Veli adı ve soyadı gereklidir.', 400);

    const existingParent = await db.parent.findFirst({ where: { phone } });
    if (existingParent) {
      const parent = await db.parent.update({
        where: { id: existingParent.id },
        data: { fullName },
        select: { id: true, userId: true, fullName: true, phone: true },
      });
      return { parent, temporaryPassword: null, isNewUser: false };
    }

    let user = await db.user.findUnique({ where: { username: phone } });
    let temporaryPassword: string | null = null;
    let isNewUser = false;

    if (!user) {
      temporaryPassword = generateParentTemporaryPassword();
      const password = await bcrypt.hash(temporaryPassword, 12);
      user = await db.user.create({
        data: { username: phone, password, role: 'PARENT', mustChangePassword: true },
      });
      isNewUser = true;
    } else if (user.role !== 'PARENT') {
      throw new AppError('Bu telefon numarası başka bir kullanıcı hesabına ait.', 409);
    }

    const parent = await db.parent.create({
      data: { userId: user.id, fullName, phone },
      select: { id: true, userId: true, fullName: true, phone: true },
    });

    return { parent, temporaryPassword, isNewUser };
  }

  async updatePhone(parentId: string, phone: string) {
    const normalized = normalizeParentPhone(phone);
    const parent = await prisma.parent.findUnique({ where: { id: parentId }, include: { user: true } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);
    if (parent.user.role !== 'PARENT') throw new AppError('Bu hesap veli hesabı değil.', 400);

    const [phoneOwner, usernameOwner] = await Promise.all([
      prisma.parent.findFirst({ where: { phone: normalized, NOT: { id: parentId } } }),
      prisma.user.findUnique({ where: { username: normalized } }),
    ]);
    if (phoneOwner || (usernameOwner && usernameOwner.id !== parent.user.id)) {
      throw new AppError('Bu telefon numarası başka bir veli hesabında kullanılıyor.', 409);
    }

    return prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: parent.user.id }, data: { username: normalized } });
      return tx.parent.update({ where: { id: parentId }, data: { phone: normalized }, select: { id: true, fullName: true, phone: true, waConsentStatus: true } });
    });
  }

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
