import { Prisma } from '@prisma/client';
import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export type StaffRole = 'KURUM_PERSONELI' | 'MUDUR_YARDIMCISI' | 'REHBER_OGRETMEN' | 'SINIF_REHBER_OGRETMEN';

const VALID_ROLES: StaffRole[] = ['KURUM_PERSONELI', 'MUDUR_YARDIMCISI', 'REHBER_OGRETMEN', 'SINIF_REHBER_OGRETMEN'];

export const ROLE_LABELS: Record<StaffRole, string> = {
  KURUM_PERSONELI: 'Kurum Personeli (Öğretmen vb.)',
  MUDUR_YARDIMCISI: 'Müdür Yardımcısı',
  REHBER_OGRETMEN: 'Okul Rehber Öğretmeni',
  SINIF_REHBER_OGRETMEN: 'Sınıf Rehber Öğretmeni',
};

class StaffService {
  async getAll(role?: string) {
    const where: Prisma.StaffWhereInput = { isActive: true };
    if (role && VALID_ROLES.includes(role as StaffRole)) {
      where.role = role as StaffRole;
    }
    return prisma.staff.findMany({
      where,
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  }

  async getByClass(className: string) {
    return prisma.staff.findFirst({
      where: { role: 'SINIF_REHBER_OGRETMEN', className, isActive: true },
    });
  }

  async create(data: { 
    name: string; 
    role: StaffRole; 
    className?: string;
    tcKimlikNo?: string;
    brans?: string;
    kurumSicilNo?: string;
    emekliSicilNo?: string;
    unvan?: string;
    gorev?: string;
  }) {
    if (!VALID_ROLES.includes(data.role)) {
      throw new AppError('Geçersiz personel rolü.', 400);
    }
    if (data.role === 'SINIF_REHBER_OGRETMEN' && !data.className?.trim()) {
      throw new AppError('Sınıf rehber öğretmeni için sınıf adı zorunludur.', 400);
    }
    return prisma.staff.create({
      data: {
        name: data.name.trim(),
        role: data.role,
        className: data.role === 'SINIF_REHBER_OGRETMEN' ? data.className!.trim() : null,
        tcKimlikNo: data.tcKimlikNo,
        brans: data.brans,
        kurumSicilNo: data.kurumSicilNo,
        emekliSicilNo: data.emekliSicilNo,
        unvan: data.unvan,
        gorev: data.gorev
      },
    });
  }

  async bulkCreate(staffList: any[]) {
    if (!staffList || staffList.length === 0) return { count: 0 };
    
    const data = staffList.map(s => ({
      name: (s.name || '').trim(),
      role: s.role || 'KURUM_PERSONELI',
      className: s.className || null,
      tcKimlikNo: s.tcKimlikNo || null,
      brans: s.brans || null,
      kurumSicilNo: s.kurumSicilNo || null,
      emekliSicilNo: s.emekliSicilNo || null,
      unvan: s.unvan || null,
      gorev: s.gorev || null,
      isActive: s.isActive !== undefined ? s.isActive : true
    })).filter(s => s.name.length > 0);

    const result = await prisma.staff.createMany({
      data
    });
    
    return { count: result.count };
  }

  async update(id: string, data: { 
    name?: string; 
    className?: string; 
    isActive?: boolean;
    tcKimlikNo?: string;
    brans?: string;
    kurumSicilNo?: string;
    emekliSicilNo?: string;
    unvan?: string;
    gorev?: string;
  }) {
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new AppError('Personel bulunamadı.', 404);

    return prisma.staff.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.className !== undefined && { className: data.className?.trim() || null }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.tcKimlikNo !== undefined && { tcKimlikNo: data.tcKimlikNo }),
        ...(data.brans !== undefined && { brans: data.brans }),
        ...(data.kurumSicilNo !== undefined && { kurumSicilNo: data.kurumSicilNo }),
        ...(data.emekliSicilNo !== undefined && { emekliSicilNo: data.emekliSicilNo }),
        ...(data.unvan !== undefined && { unvan: data.unvan }),
        ...(data.gorev !== undefined && { gorev: data.gorev }),
      },
    });
  }

  async delete(id: string) {
    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new AppError('Personel bulunamadı.', 404);
    await prisma.staff.delete({ where: { id } });
  }
}

export const staffService = new StaffService();
