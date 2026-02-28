import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import bcrypt from 'bcrypt';

export class StudentsService {
  async getAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' as const } },
            { schoolNumber: { contains: search, mode: 'insensitive' as const } },
            { className: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { className: 'asc' },
          { schoolNumber: 'asc' },
        ],
        include: {
          parents: { select: { id: true, fullName: true, phone: true } },
          _count: { select: { absenteeisms: true } },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(id: string) {
    const student = await (prisma.student.findUnique as any)({
      where: { id },
      include: {
        parents: { select: { id: true, fullName: true, phone: true } },
        absenteeisms: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            warningNumber: true,
            createdAt: true,
            viewedByParent: true,
          },
        },
      },
    });

    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    return student;
  }

  async create(data: {
    schoolNumber: string;
    fullName: string;
    className: string;
    parents?: { fullName: string; phone: string }[];
  }) {
    const existing = await prisma.student.findUnique({
      where: { schoolNumber: data.schoolNumber },
    });

    if (existing) {
      throw new AppError('Bu okul numarası zaten kayıtlı.', 409);
    }

    const { parents, ...studentData } = data;

    // Use transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
      const student = await tx.student.create({ data: studentData });

      // Create parents if provided
      if (parents && parents.length > 0) {
        for (const p of parents) {
          if (!p.fullName || !p.phone) continue;

          const phone = p.phone.trim();
          const username = phone;
          const passwordRaw = phone.slice(-6);
          const passwordHash = await bcrypt.hash(passwordRaw, 10);

          // Find or create user by phone-based username
          let user = await tx.user.findUnique({ where: { username } });
          if (!user) {
            user = await tx.user.create({
              data: { username, password: passwordHash, role: 'PARENT' },
            });
          }

          // Find or create parent
          let parent = await tx.parent.findUnique({ where: { userId: user.id } });
          if (!parent) {
            parent = await tx.parent.create({
              data: { userId: user.id, fullName: p.fullName.trim(), phone },
            });
          } else {
            // Update name if changed
            parent = await tx.parent.update({
              where: { id: parent.id },
              data: { fullName: p.fullName.trim(), phone },
            });
          }

          // Connect parent to student
          await tx.student.update({
            where: { id: student.id },
            data: { parents: { connect: { id: parent.id } } },
          });
        }
      }

      return tx.student.findUnique({
        where: { id: student.id },
        include: { parents: { select: { id: true, fullName: true, phone: true } } },
      });
    });
  }

  async update(
    id: string,
    data: { fullName?: string; className?: string; status?: 'ACTIVE' | 'INACTIVE' }
  ) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    return prisma.student.update({ where: { id }, data });
  }

  async delete(id: string) {
    const student = await prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new AppError('Öğrenci bulunamadı.', 404);
    }

    await prisma.student.delete({ where: { id } });
    return { message: 'Öğrenci başarıyla silindi.' };
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new AppError('Silinecek öğrenci seçilmedi.', 400);
    }

    const result = await prisma.student.deleteMany({
      where: { id: { in: ids } },
    });

    return { message: `${result.count} öğrenci başarıyla silindi.`, deletedCount: result.count };
  }

  async assignParent(studentId: string, parentId: string) {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);

    const parent = await prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);

    return prisma.student.update({
      where: { id: studentId },
      data: { parents: { connect: { id: parentId } } },
      include: { parents: { select: { id: true, fullName: true, phone: true } } },
    });
  }

  async updateParent(parentId: string, data: { fullName?: string; phone?: string }) {
    const parent = await prisma.parent.findUnique({ where: { id: parentId } });
    if (!parent) throw new AppError('Veli bulunamadı.', 404);

    return prisma.parent.update({
      where: { id: parentId },
      data,
      select: { id: true, fullName: true, phone: true },
    });
  }

  async removeParentFromStudent(studentId: string, parentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { parents: { where: { id: parentId } } },
    });
    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);
    if (student.parents.length === 0) throw new AppError('Bu veli öğrenciye bağlı değil.', 400);

    return prisma.student.update({
      where: { id: studentId },
      data: { parents: { disconnect: { id: parentId } } },
      include: { parents: { select: { id: true, fullName: true, phone: true } } },
    });
  }
}

export const studentsService = new StudentsService();
