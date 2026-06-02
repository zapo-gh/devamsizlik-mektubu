import path from 'path';
import fs from 'fs';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';
import { generateParentMeetingPdf, ParentMeetingPdfData } from './parentMeetingPdf.generator';

class ParentMeetingService {
  /** Tüm aktif sınıf isimlerini döndürür */
  async getClasses(): Promise<string[]> {
    const rows = await prisma.student.findMany({
      where: { status: 'ACTIVE' },
      select: { className: true },
      distinct: ['className'],
      orderBy: { className: 'asc' },
    });
    return rows.map(r => r.className);
  }

  /** Verilen sınıflar için veli imza sirküsü PDF'i oluşturur (tek PDF, ayrı sayfalar) */
  async generatePdf(params: {
    classNames: string[];
    meetingDate: Date;
    schoolYear: string;
    term: string;
    includeParentName?: boolean;
  }): Promise<string> {
    // Okul adı ayarlardan
    const settings = await prisma.schoolSettings.findUnique({
      where: { id: 'singleton' },
    });
    const schoolName = settings?.schoolName || 'OKUL ADI';

    const items: ParentMeetingPdfData[] = [];

    for (const cn of params.classNames) {
      const students = await prisma.student.findMany({
        where: { className: cn, status: 'ACTIVE' },
        include: { parents: true },
        orderBy: { fullName: 'asc' },
      });

      items.push({
        schoolName,
        className: cn,
        meetingDate: params.meetingDate,
        schoolYear: params.schoolYear,
        term: params.term,
        students: students.map((s, idx) => ({
          orderNo: idx + 1,
          studentFullName: s.fullName,
          parentFullName: params.includeParentName !== false ? s.parents[0]?.fullName : undefined,
        })),
      });
    }

    const ts = Date.now();
    const outputPath = path.join(
      config.upload.dir,
      'parent-meetings',
      `meeting_${ts}.pdf`,
    );

    await generateParentMeetingPdf(items, outputPath);
    return outputPath;
  }
}

export const parentMeetingService = new ParentMeetingService();
