import prisma from '../utils/prisma';
import { v4 as uuid } from 'uuid';

/** Generic CRUD: raw SQL + dynamic column building. */
function buildUpdate(table: string, id: string, data: Record<string, any>) {
  const sets: string[] = []; const vals: any[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) { sets.push(`"${k}"=?`); vals.push(v); }
  }
  if (!sets.length) return null;
  vals.push(id);
  return { sql: `UPDATE "${table}" SET ${sets.join(',')} WHERE "id"=?`, vals };
}

// ── Yıllık Çalışma Planı ──
class AnnualPlanService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "AnnualPlanItem" WHERE "academicYear"=? ORDER BY "month" ASC, "sortOrder" ASC`, academicYear
    );
  }
  async create(d: { academicYear: string; month: number; title: string; description?: string; category?: string; sortOrder?: number }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AnnualPlanItem" ("id","academicYear","month","title","description","category","sortOrder") VALUES (?,?,?,?,?,?,?)`,
      id, d.academicYear, d.month, d.title.trim(), d.description || null, d.category || 'IDARI', d.sortOrder ?? 0
    );
    return { id, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('AnnualPlanItem', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "AnnualPlanItem" WHERE "id"=?`, id); }
}

// ── Belirli Gün ve Haftalar ──
class CommemorativeDaysService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT cd.*, s."name" as "assignedStaffName"
       FROM "CommemorativeDay" cd LEFT JOIN "Staff" s ON s."id"=cd."assignedStaffId"
       WHERE cd."academicYear"=? ORDER BY cd."startDate" ASC`, academicYear
    );
  }
  async create(d: { name: string; startDate: string; endDate: string; academicYear: string; description?: string; assignedStaffId?: string; status?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "CommemorativeDay" ("id","name","startDate","endDate","academicYear","description","assignedStaffId","status") VALUES (?,?,?,?,?,?,?,?)`,
      id, d.name.trim(), d.startDate, d.endDate, d.academicYear, d.description || null, d.assignedStaffId || null, d.status || 'PLANLI'
    );
    return { id, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('CommemorativeDay', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "CommemorativeDay" WHERE "id"=?`, id); }
}

// ── Sosyal Etkinlik ──
class SocialActivityService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT sa.*, s."name" as "assignedStaffName"
       FROM "SocialActivity" sa LEFT JOIN "Staff" s ON s."id"=sa."assignedStaffId"
       WHERE sa."academicYear"=? ORDER BY sa."plannedDate" ASC`, academicYear
    );
  }
  async create(d: { name: string; type?: string; description?: string; plannedDate?: string; academicYear: string; assignedStaffId?: string; status?: string; notes?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "SocialActivity" ("id","name","type","description","plannedDate","academicYear","assignedStaffId","status","notes") VALUES (?,?,?,?,?,?,?,?,?)`,
      id, d.name.trim(), d.type || 'KULTUREL', d.description || null, d.plannedDate || null, d.academicYear, d.assignedStaffId || null, d.status || 'PLANLI', d.notes || null
    );
    return { id, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('SocialActivity', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "SocialActivity" WHERE "id"=?`, id); }
}

// ── Okul Aile Birliği ──
class ParentAssociationService {
  async getMeetings(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ParentAssociationMeeting" WHERE "academicYear"=? ORDER BY "date" DESC`, academicYear
    );
  }
  async createMeeting(d: { date: string; type?: string; meetingNumber?: number; academicYear: string; notes?: string; decisions?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ParentAssociationMeeting" ("id","date","type","meetingNumber","academicYear","notes","decisions") VALUES (?,?,?,?,?,?,?)`,
      id, d.date, d.type || 'OLAGAN', d.meetingNumber ?? 1, d.academicYear, d.notes || null, d.decisions || null
    );
    return { id, ...d };
  }
  async updateMeeting(id: string, data: Record<string, any>) {
    const u = buildUpdate('ParentAssociationMeeting', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async deleteMeeting(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "ParentAssociationMeeting" WHERE "id"=?`, id); }

  async getMembers(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ParentAssociationMember" WHERE "academicYear"=? ORDER BY "role" ASC, "fullName" ASC`, academicYear
    );
  }
  async createMember(d: { fullName: string; role?: string; phone?: string; academicYear: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "ParentAssociationMember" ("id","fullName","role","phone","academicYear") VALUES (?,?,?,?,?)`,
      id, d.fullName.trim(), d.role || 'UYE', d.phone || null, d.academicYear
    );
    return { id, ...d };
  }
  async updateMember(id: string, data: Record<string, any>) {
    const u = buildUpdate('ParentAssociationMember', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async deleteMember(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "ParentAssociationMember" WHERE "id"=?`, id); }
}

// ── Gezi Planı ──
class FieldTripService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT ft.*, s."name" as "assignedStaffName"
       FROM "FieldTrip" ft LEFT JOIN "Staff" s ON s."id"=ft."assignedStaffId"
       WHERE ft."academicYear"=? ORDER BY ft."date" ASC`, academicYear
    );
  }
  async create(d: Record<string, any>) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "FieldTrip" ("id","title","destination","date","returnDate","purpose","transportation","assignedStaffId","academicYear","participantClasses","notes","status") VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, d.title, d.destination, d.date, d.returnDate || null, d.purpose || null, d.transportation || null,
      d.assignedStaffId || null, d.academicYear, d.participantClasses || null, d.notes || null, d.status || 'PLANLI'
    );
    return { id, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('FieldTrip', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "FieldTrip" WHERE "id"=?`, id); }
}

// ── Ders Dışı Egzersiz ──
class ExtracurricularService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT e.*, s."name" as "assignedStaffName"
       FROM "Extracurricular" e LEFT JOIN "Staff" s ON s."id"=e."assignedStaffId"
       WHERE e."academicYear"=? ORDER BY e."branch" ASC`, academicYear
    );
  }
  async create(d: { branch: string; assignedStaffId?: string; schedule?: string; academicYear: string; notes?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Extracurricular" ("id","branch","assignedStaffId","schedule","academicYear","notes") VALUES (?,?,?,?,?,?)`,
      id, d.branch.trim(), d.assignedStaffId || null, d.schedule || null, d.academicYear, d.notes || null
    );
    return { id, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('Extracurricular', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "Extracurricular" WHERE "id"=?`, id); }
}

// ── Yolluk Hesaplama ──
class TravelAllowanceService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "TravelAllowance" WHERE "academicYear"=? ORDER BY "departureDate" DESC`, academicYear
    );
  }
  async create(d: Record<string, any>) {
    const id = uuid();
    const total = (Number(d.transportCost) || 0) + (Number(d.dailyAllowance) || 0) + (Number(d.accommodationCost) || 0);
    await prisma.$executeRawUnsafe(
      `INSERT INTO "TravelAllowance" ("id","staffId","staffName","title","purpose","departurePlace","arrivalPlace","departureDate","returnDate","transportType","transportCost","dailyAllowance","accommodationCost","totalCost","academicYear","notes") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, d.staffId || null, d.staffName, d.title || null, d.purpose, d.departurePlace, d.arrivalPlace,
      d.departureDate, d.returnDate, d.transportType || 'OTOBÜS', d.transportCost || 0, d.dailyAllowance || 0,
      d.accommodationCost || 0, total, d.academicYear, d.notes || null
    );
    return { id, totalCost: total, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    if (data.transportCost !== undefined || data.dailyAllowance !== undefined || data.accommodationCost !== undefined) {
      data.totalCost = (Number(data.transportCost) || 0) + (Number(data.dailyAllowance) || 0) + (Number(data.accommodationCost) || 0);
    }
    const u = buildUpdate('TravelAllowance', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "TravelAllowance" WHERE "id"=?`, id); }
}

// ── Personel Nakil Bildirimi ──
class StaffTransferService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "StaffTransfer" WHERE "academicYear"=? ORDER BY "transferDate" DESC`, academicYear
    );
  }
  async create(d: Record<string, any>) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StaffTransfer" ("id","staffName","staffTitle","tcKimlikNo","sicilNo","currentSchool","newSchool","transferDate","transferReason","academicYear","notes") VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      id, d.staffName, d.staffTitle || null, d.tcKimlikNo || null, d.sicilNo || null, d.currentSchool || null,
      d.newSchool || null, d.transferDate, d.transferReason || null, d.academicYear, d.notes || null
    );
    return { id, ...d };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('StaffTransfer', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "StaffTransfer" WHERE "id"=?`, id); }
}

// ── Öğrenci Kulüpleri ──
class StudentClubService {
  async getAll(academicYear: string) {
    const clubs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT sc.*, s."name" as "assignedStaffName"
       FROM "StudentClub" sc LEFT JOIN "Staff" s ON s."id"=sc."assignedStaffId"
       WHERE sc."academicYear"=? ORDER BY sc."name" ASC`, academicYear
    );
    for (const c of clubs) {
      const countRes = await prisma.$queryRawUnsafe<any[]>(
        `SELECT COUNT(*) as c FROM "StudentClubMember" WHERE "clubId"=?`, c.id
      );
      c.memberCount = countRes[0]?.c || 0;
    }
    return clubs;
  }
  async create(d: { name: string; description?: string; assignedStaffId?: string; meetingDay?: string; meetingTime?: string; maxMembers?: number; academicYear: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "StudentClub" ("id","name","description","assignedStaffId","meetingDay","meetingTime","maxMembers","academicYear") VALUES (?,?,?,?,?,?,?,?)`,
      id, d.name.trim(), d.description || null, d.assignedStaffId || null, d.meetingDay || null, d.meetingTime || null, d.maxMembers ?? 30, d.academicYear
    );
    return { id, ...d, memberCount: 0 };
  }
  async update(id: string, data: Record<string, any>) {
    const u = buildUpdate('StudentClub', id, data);
    if (u) await prisma.$executeRawUnsafe(u.sql, ...u.vals);
  }
  async delete(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "StudentClub" WHERE "id"=?`, id); }

  // Üyeler
  async getMembers(clubId: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT scm.*, st."fullName" as "studentName", st."className"
       FROM "StudentClubMember" scm LEFT JOIN "Student" st ON st."id"=scm."studentId"
       WHERE scm."clubId"=? ORDER BY scm."role" ASC, st."fullName" ASC`, clubId
    );
  }
  async addMember(d: { clubId: string; studentId: string; role?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT OR IGNORE INTO "StudentClubMember" ("id","clubId","studentId","role") VALUES (?,?,?,?)`,
      id, d.clubId, d.studentId, d.role || 'UYE'
    );
    return { id, ...d };
  }
  async removeMember(id: string) { await prisma.$executeRawUnsafe(`DELETE FROM "StudentClubMember" WHERE "id"=?`, id); }
}

export const annualPlanService = new AnnualPlanService();
export const commemorativeDaysService = new CommemorativeDaysService();
export const socialActivityService = new SocialActivityService();
export const parentAssociationService = new ParentAssociationService();
export const fieldTripService = new FieldTripService();
export const extracurricularService = new ExtracurricularService();
export const travelAllowanceService = new TravelAllowanceService();
export const staffTransferService = new StaffTransferService();
export const studentClubService = new StudentClubService();
