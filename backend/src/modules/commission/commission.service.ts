import prisma from '../shared/utils/prisma';
import { v4 as uuid } from 'uuid';

class CommissionService {
  async getAll(academicYear: string) {
    const commissions = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Commission" WHERE "academicYear"=? ORDER BY "sortOrder" ASC, "name" ASC`, academicYear
    );
    for (const c of commissions) {
      c.roles = await prisma.$queryRawUnsafe<any[]>(
        `SELECT cr.*, ca."staffId", s."name" as "staffName"
         FROM "CommissionRole" cr
         LEFT JOIN "CommissionAssignment" ca ON ca."roleId" = cr."id"
         LEFT JOIN "Staff" s ON s."id" = ca."staffId"
         WHERE cr."commissionId"=?
         ORDER BY cr."sortOrder" ASC`, c.id
      );
    }
    return commissions;
  }

  async create(data: { name: string; description?: string; academicYear: string; sortOrder?: number }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Commission" ("id","name","description","academicYear","sortOrder") VALUES (?,?,?,?,?)`,
      id, data.name.trim(), data.description || null, data.academicYear, data.sortOrder ?? 0
    );
    return { id, ...data, roles: [] };
  }

  async update(id: string, data: Partial<{ name: string; description: string; sortOrder: number }>) {
    const sets: string[] = []; const vals: any[] = [];
    if (data.name !== undefined) { sets.push(`"name"=?`); vals.push(data.name.trim()); }
    if (data.description !== undefined) { sets.push(`"description"=?`); vals.push(data.description); }
    if (data.sortOrder !== undefined) { sets.push(`"sortOrder"=?`); vals.push(data.sortOrder); }
    if (!sets.length) return;
    vals.push(id);
    await prisma.$executeRawUnsafe(`UPDATE "Commission" SET ${sets.join(',')} WHERE "id"=?`, ...vals);
  }

  async delete(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "Commission" WHERE "id"=?`, id);
  }

  // Roller
  async addRole(data: { commissionId: string; roleName: string; sortOrder?: number }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CommissionRole" ("id","commissionId","roleName","sortOrder") VALUES (?,?,?,?)`,
      id, data.commissionId, data.roleName, data.sortOrder ?? 0
    );
    return { id, ...data };
  }

  async deleteRole(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "CommissionRole" WHERE "id"=?`, id);
  }

  // Atamalar
  async assign(data: { roleId: string; staffId: string }) {
    // Önce mevcut atamayı sil
    await prisma.$executeRawUnsafe(`DELETE FROM "CommissionAssignment" WHERE "roleId"=?`, data.roleId);
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CommissionAssignment" ("id","roleId","staffId") VALUES (?,?,?)`,
      id, data.roleId, data.staffId
    );
    return { id, ...data };
  }

  async unassign(roleId: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "CommissionAssignment" WHERE "roleId"=?`, roleId);
  }
}

export const commissionService = new CommissionService();
