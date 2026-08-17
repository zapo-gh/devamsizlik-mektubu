import prisma from '../shared/utils/prisma';
import { AppError } from '../shared/middleware/errorHandler.middleware';
import { v4 as uuid } from 'uuid';

class DutyScheduleService {
  // ── Nöbet Noktaları ──
  async getStations() {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "DutyStation" WHERE "isActive" = 1 ORDER BY "sortOrder" ASC, "name" ASC`
    );
  }

  async createStation(data: { name: string; sortOrder?: number }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DutyStation" ("id","name","sortOrder") VALUES (?,?,?)`,
      id, data.name.trim(), data.sortOrder ?? 0
    );
    return { id, name: data.name.trim(), sortOrder: data.sortOrder ?? 0, isActive: 1 };
  }

  async updateStation(id: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) {
    const sets: string[] = [];
    const vals: any[] = [];
    if (data.name !== undefined) { sets.push(`"name"=?`); vals.push(data.name.trim()); }
    if (data.sortOrder !== undefined) { sets.push(`"sortOrder"=?`); vals.push(data.sortOrder); }
    if (data.isActive !== undefined) { sets.push(`"isActive"=?`); vals.push(data.isActive ? 1 : 0); }
    if (sets.length === 0) throw new AppError('Güncellenecek alan bulunamadı.', 400);
    vals.push(id);
    await prisma.$executeRawUnsafe(`UPDATE "DutyStation" SET ${sets.join(',')} WHERE "id"=?`, ...vals);
  }

  async deleteStation(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "DutyStation" WHERE "id"=?`, id);
  }

  // ── Nöbet Atamaları ──
  async getAssignments(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT da.*, s."name" as "staffName", ds."name" as "stationName"
       FROM "DutyAssignment" da
       LEFT JOIN "Staff" s ON s."id" = da."staffId"
       LEFT JOIN "DutyStation" ds ON ds."id" = da."stationId"
       WHERE da."academicYear" = ?
       ORDER BY da."dayOfWeek" ASC, da."weekNumber" ASC`,
      academicYear
    );
  }

  async createAssignment(data: { staffId: string; stationId: string; dayOfWeek: number; weekNumber?: number; academicYear: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "DutyAssignment" ("id","staffId","stationId","dayOfWeek","weekNumber","academicYear") VALUES (?,?,?,?,?,?)`,
      id, data.staffId, data.stationId, data.dayOfWeek, data.weekNumber ?? 0, data.academicYear
    );
    return { id, ...data };
  }

  async deleteAssignment(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "DutyAssignment" WHERE "id"=?`, id);
  }

  async bulkSaveAssignments(academicYear: string, assignments: { staffId: string; stationId: string; dayOfWeek: number; weekNumber?: number }[]) {
    await prisma.$executeRawUnsafe(`DELETE FROM "DutyAssignment" WHERE "academicYear"=?`, academicYear);
    for (const a of assignments) {
      const id = uuid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "DutyAssignment" ("id","staffId","stationId","dayOfWeek","weekNumber","academicYear") VALUES (?,?,?,?,?,?)`,
        id, a.staffId, a.stationId, a.dayOfWeek, a.weekNumber ?? 0, academicYear
      );
    }
  }
}

export const dutyScheduleService = new DutyScheduleService();
