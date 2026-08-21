import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';

export class Student360Service {
  async getById(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        schoolNumber: true,
        fullName: true,
        className: true,
        status: true,
        createdAt: true,
        parents: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            waConsentStatus: true,
            waConsentDate: true,
            user: { select: { id: true, username: true, mustChangePassword: true, createdAt: true } },
          },
        },
        absenteeisms: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            warningNumber: true,
            isBep: true,
            excusedDays: true,
            unexcusedDays: true,
            createdAt: true,
            viewedByParent: true,
            waSentAt: true,
          },
        },
        writtenWarnings: {
          orderBy: { issuedAt: 'desc' },
          select: {
            id: true,
            warningNumber: true,
            behaviorCode: true,
            behaviorText: true,
            description: true,
            guidanceNote: true,
            issuedBy: true,
            issuedAt: true,
            waSentAt: true,
          },
        },
        dailyViolations: {
          orderBy: { violationDate: 'desc' },
          select: {
            id: true,
            type: true,
            violationDate: true,
            matchedBy: true,
            isConfirmed: true,
            createdAt: true,
            upload: { select: { id: true, description: true, imagePath: true, uploadedBy: true } },
          },
        },
      },
    });

    if (!student) throw new AppError('Öğrenci bulunamadı.', 404);

    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: 'Student', entityId: studentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        user: { select: { username: true, role: true } },
      },
    });

    const absenteeism = student.absenteeisms.reduce(
      (acc, item) => {
        acc.records += 1;
        acc.excusedDays += item.excusedDays ?? 0;
        acc.unexcusedDays += item.unexcusedDays ?? 0;
        if (item.waSentAt) acc.sent += 1;
        else acc.pending += 1;
        return acc;
      },
      { records: 0, excusedDays: 0, unexcusedDays: 0, sent: 0, pending: 0 },
    );

    return {
      student: {
        id: student.id,
        schoolNumber: student.schoolNumber,
        fullName: student.fullName,
        className: student.className,
        status: student.status,
        createdAt: student.createdAt,
      },
      parents: student.parents,
      absenteeisms: { summary: absenteeism, records: student.absenteeisms },
      warnings: { total: student.writtenWarnings.length, records: student.writtenWarnings },
      violations: {
        total: student.dailyViolations.length,
        confirmed: student.dailyViolations.filter((v) => v.isConfirmed).length,
        records: student.dailyViolations,
      },
      auditLogs,
    };
  }
}

export const student360Service = new Student360Service();
