import prisma from '../shared/utils/prisma';
import { v4 as uuid } from 'uuid';

class HolidayService {
  async getAll(academicYear: string) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "Holiday" WHERE "academicYear"=? ORDER BY "startDate" ASC`, academicYear
    );
  }

  async create(data: { name: string; startDate: string; endDate: string; academicYear: string; isRecurring?: boolean }) {
    const id = uuid();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Holiday" ("id","name","startDate","endDate","academicYear") VALUES (?,?,?,?,?)`,
      id, data.name.trim(), data.startDate, data.endDate, data.academicYear
    );
    return { id, ...data };
  }

  async update(id: string, data: Partial<{ name: string; startDate: string; endDate: string; isRecurring: boolean }>) {
    const sets: string[] = []; const vals: any[] = [];
    if (data.name !== undefined) { sets.push(`"name"=?`); vals.push(data.name.trim()); }
    if (data.startDate !== undefined) { sets.push(`"startDate"=?`); vals.push(data.startDate); }
    if (data.endDate !== undefined) { sets.push(`"endDate"=?`); vals.push(data.endDate); }
    if (!sets.length) return;
    vals.push(id);
    await prisma.$executeRawUnsafe(`UPDATE "Holiday" SET ${sets.join(',')} WHERE "id"=?`, ...vals);
  }

  async delete(id: string) {
    await prisma.$executeRawUnsafe(`DELETE FROM "Holiday" WHERE "id"=?`, id);
  }

  async seedDefaults(academicYear: string) {
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT COUNT(*) as c FROM "Holiday" WHERE "academicYear"=?`, academicYear
    );
    if ((existing[0]?.c || 0) > 0) return;

    const defaults = [
      { name: '29 Ekim Cumhuriyet Bayramı', start: '10-29', end: '10-29' },
      { name: '10 Kasım Atatürk\'ü Anma', start: '11-10', end: '11-10' },
      { name: '24 Kasım Öğretmenler Günü', start: '11-24', end: '11-24' },
      { name: 'Yılbaşı Tatili', start: '01-01', end: '01-01' },
      { name: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', start: '04-23', end: '04-23' },
      { name: '1 Mayıs Emek ve Dayanışma Günü', start: '05-01', end: '05-01' },
      { name: '19 Mayıs Gençlik ve Spor Bayramı', start: '05-19', end: '05-19' },
      { name: '15 Temmuz Demokrasi ve Milli Birlik Günü', start: '07-15', end: '07-15' },
      { name: '30 Ağustos Zafer Bayramı', start: '08-30', end: '08-30' },
    ];

    const [startYear, endYear] = academicYear.split('-').map(Number);
    for (const d of defaults) {
      const [mm] = d.start.split('-').map(Number);
      const year = mm >= 9 ? startYear : endYear;
      const id = uuid();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "Holiday" ("id","name","startDate","endDate","academicYear") VALUES (?,?,?,?,?)`,
        id, d.name, `${year}-${d.start}`, `${year}-${d.end}`, academicYear
      );
    }
  }
}

export const holidayService = new HolidayService();
