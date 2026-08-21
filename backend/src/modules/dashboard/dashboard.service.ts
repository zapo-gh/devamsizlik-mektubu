import prisma from '../shared/utils/prisma';

export class DashboardService {
  async getSummary() {
    const [
      totalStudents,
      totalStaff,
      absenteeismTotal,
      absenteeismSent,
      absenteeismNotSent,
      warningTotal,
      warningStudents,
      violationUploads,
      violationTotal,
      confirmedViolations,
      waConnectedParents,
      settings,
      fieldTripsCount,
      commissionsCount,
      dutyCount,
    ] = await Promise.all([
      prisma.student.count({ where: { status: 'ACTIVE' } }),
      prisma.staff.count({ where: { isActive: true } }),
      prisma.absenteeism.count(),
      prisma.absenteeism.count({ where: { waSentAt: { not: null } } }),
      prisma.absenteeism.count({ where: { waSentAt: null } }),
      prisma.writtenWarning.count(),
      prisma.writtenWarning.groupBy({ by: ['studentId'] }),
      prisma.violationUpload.count(),
      prisma.dailyViolation.count(),
      prisma.dailyViolation.count({ where: { isConfirmed: true } }),
      prisma.parent.count({ where: { waConsentStatus: 'ACCEPTED' } }),
      prisma.schoolSettings.findUnique({ where: { id: 'singleton' } }),
      prisma.fieldTrip.count(),
      prisma.commission.count({ where: { status: 'AKTIF' } }),
      prisma.dutyStation.count({ where: { isActive: 1 } }),
    ]);

    return {
      totalStudents,
      totalStaff,
      absenteeism: {
        total: absenteeismTotal,
        sentCount: absenteeismSent,
        notSentCount: absenteeismNotSent,
      },
      warnings: {
        total: warningTotal,
        studentsWithWarnings: warningStudents.length,
      },
      violations: {
        totalUploads: violationUploads,
        totalViolations: violationTotal,
        confirmedViolations,
      },
      whatsapp: {
        consentedParents: waConnectedParents,
      },
      schoolName: settings?.schoolName ?? '',
      principalName: settings?.principalName ?? '',
      fieldTripsCount,
      commissionsCount,
      dutyCount,
    };
  }
}

export const dashboardService = new DashboardService();
