import prisma from '../shared/utils/prisma';
import { v4 as uuid } from 'uuid';

class BoardMeetingService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "BoardMeeting" WHERE "academicYear"=? ORDER BY "date" DESC`, academicYear
    );
  }

  async getById(id: string) {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "BoardMeeting" WHERE "id"=?`, id);
    if (!rows.length) return null;
    const meeting = rows[0];
    meeting.agendaItems = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "BoardAgendaItem" WHERE "meetingId"=? ORDER BY "orderNumber" ASC`, id
    );
    return meeting;
  }

  async create(data: { date: string; type: string; meetingNumber: number; academicYear: string; notes?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "BoardMeeting" ("id","date","type","meetingNumber","academicYear","notes") VALUES (?,?,?,?,?,?)`,
      id, data.date, data.type, data.meetingNumber, data.academicYear, data.notes || null
    );
    return { id, ...data };
  }

  async update(id: string, data: Partial<{ date: string; type: string; meetingNumber: number; notes: string }>) {
    const sets: string[] = []; const vals: any[] = [];
    if (data.date !== undefined) { sets.push(`"date"=?`); vals.push(data.date); }
    if (data.type !== undefined) { sets.push(`"type"=?`); vals.push(data.type); }
    if (data.meetingNumber !== undefined) { sets.push(`"meetingNumber"=?`); vals.push(data.meetingNumber); }
    if (data.notes !== undefined) { sets.push(`"notes"=?`); vals.push(data.notes); }
    if (!sets.length) return;
    vals.push(id);
    await prisma.$executeRawUnsafe(`UPDATE "BoardMeeting" SET ${sets.join(',')} WHERE "id"=?`, ...vals);
  }

  async delete(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "BoardMeeting" WHERE "id"=?`, id);
  }

  // ── Gündem Maddeleri ──
  async addAgendaItem(data: { meetingId: string; orderNumber: number; topic: string; decision?: string; explanation?: string }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "BoardAgendaItem" ("id","meetingId","orderNumber","topic","decision","explanation") VALUES (?,?,?,?,?,?)`,
      id, data.meetingId, data.orderNumber, data.topic, data.decision || null, data.explanation || null
    );
    return { id, ...data };
  }

  async updateAgendaItem(id: string, data: Partial<{ orderNumber: number; topic: string; decision: string; explanation: string }>) {
    const sets: string[] = []; const vals: any[] = [];
    if (data.orderNumber !== undefined) { sets.push(`"orderNumber"=?`); vals.push(data.orderNumber); }
    if (data.topic !== undefined) { sets.push(`"topic"=?`); vals.push(data.topic); }
    if (data.decision !== undefined) { sets.push(`"decision"=?`); vals.push(data.decision); }
    if (data.explanation !== undefined) { sets.push(`"explanation"=?`); vals.push(data.explanation); }
    if (!sets.length) return;
    vals.push(id);
    await prisma.$executeRawUnsafe(`UPDATE "BoardAgendaItem" SET ${sets.join(',')} WHERE "id"=?`, ...vals);
  }

  async deleteAgendaItem(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "BoardAgendaItem" WHERE "id"=?`, id);
  }
}

export const boardMeetingService = new BoardMeetingService();
