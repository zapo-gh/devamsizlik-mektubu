import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import prisma from '../shared/utils/prisma';

interface ParsedParentRow {
  schoolNumber: string;
  studentName: string;
  className: string;
  parent1Name: string;
  parent1Phone: string;
  parent1Relation: string;
  parent2Name: string;
  parent2Phone: string;
}

export interface ParentImportPreview {
  schoolNumber: string;
  studentName: string;
  className: string;
  matched: boolean;
  parent1Name: string;
  parent1Phone: string;
  parent2Name: string;
  parent2Phone: string;
}

export interface ParentImportResult {
  totalParsed: number;
  matched: number;
  unmatched: number;
  parentsCreated: number;
  parentsUpdated: number;
  errors: string[];
  preview: ParentImportPreview[];
}

/**
 * Parse parent Excel file.
 *
 * Expected columns (row 1 = header):
 *   A (0): Okul No
 *   B (1): Öğr. Ad Soyad
 *   C (2): Sınıf/Grup
 *   D (3): 1. Veli Telefon
 *   E (4): 1. Veli Ad Soyad
 *   F (5): 1. Veli Yakınlık
 *   G (6): 2. Veli Telefon
 *   H (7): 2. Veli Adı
 */
export function parseParentExcel(buffer: Buffer): ParsedParentRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const results: ParsedParentRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    // Skip header row (row 0)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const schoolNumber = String(row[0] ?? '').trim();
      if (!schoolNumber || isNaN(Number(schoolNumber))) continue;

      const studentName = String(row[1] ?? '').trim();
      const className = String(row[2] ?? '').trim();
      const parent1Phone = normalizePhone(String(row[3] ?? '').trim());
      const parent1Name = String(row[4] ?? '').trim();
      const parent1Relation = String(row[5] ?? '').trim();
      const parent2Phone = normalizePhone(String(row[6] ?? '').trim());
      const parent2Name = String(row[7] ?? '').trim();

      if (!parent1Name && !parent2Name) continue;

      results.push({
        schoolNumber,
        studentName,
        className,
        parent1Name,
        parent1Phone,
        parent1Relation,
        parent2Name,
        parent2Phone,
      });
    }
  }

  return results;
}

/**
 * Normalize Turkish phone numbers: ensure 0XXXXXXXXXX format (11 digits).
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove spaces, dashes, parens
  let cleaned = phone.replace(/[\s\-()]/g, '');
  // If starts with +90, replace with 0
  if (cleaned.startsWith('+90')) cleaned = '0' + cleaned.slice(3);
  // If starts with 90 and is 12 digits, replace with 0
  if (cleaned.startsWith('90') && cleaned.length === 12) cleaned = '0' + cleaned.slice(2);
  // If 10 digits starting with 5, prepend 0
  if (cleaned.length === 10 && cleaned.startsWith('5')) cleaned = '0' + cleaned;
  return cleaned;
}

/**
 * Preview or import parents from parsed data.
 */
export async function importParents(
  rows: ParsedParentRow[],
  mode: 'preview' | 'import'
): Promise<ParentImportResult> {
  const result: ParentImportResult = {
    totalParsed: rows.length,
    matched: 0,
    unmatched: 0,
    parentsCreated: 0,
    parentsUpdated: 0,
    errors: [],
    preview: [],
  };

  // Fetch all students for matching
  const allStudents = await prisma.student.findMany({
    select: { id: true, schoolNumber: true, fullName: true },
  });

  const studentByNumber = new Map(allStudents.map((s) => [s.schoolNumber, s]));

  for (const row of rows) {
    const student = studentByNumber.get(row.schoolNumber);
    const matched = !!student;

    result.preview.push({
      schoolNumber: row.schoolNumber,
      studentName: row.studentName,
      className: row.className,
      matched,
      parent1Name: row.parent1Name,
      parent1Phone: row.parent1Phone,
      parent2Name: row.parent2Name,
      parent2Phone: row.parent2Phone,
    });

    if (matched) {
      result.matched++;
    } else {
      result.unmatched++;
    }
  }

  if (mode === 'preview') {
    return result;
  }

  // Import mode: create/link parents for matched students
  for (const row of rows) {
    const student = studentByNumber.get(row.schoolNumber);
    if (!student) continue;

    // Process parent 1
    if (row.parent1Name && row.parent1Phone) {
      try {
        await upsertAndLinkParent(student.id, row.parent1Name, row.parent1Phone, result);
      } catch (err: any) {
        result.errors.push(`${row.schoolNumber} Veli1: ${err.message}`);
      }
    }

    // Process parent 2
    if (row.parent2Name && row.parent2Phone) {
      try {
        await upsertAndLinkParent(student.id, row.parent2Name, row.parent2Phone, result);
      } catch (err: any) {
        result.errors.push(`${row.schoolNumber} Veli2: ${err.message}`);
      }
    }
  }

  return result;
}

/**
 * Find or create a parent by phone number, then link to the student.
 * If a parent with the same phone exists, update name and link.
 * Otherwise create a new User + Parent.
 */
async function upsertAndLinkParent(
  studentId: string,
  fullName: string,
  phone: string,
  result: ParentImportResult
) {
  // Check if parent with this phone already exists
  const existingParent = await prisma.parent.findFirst({
    where: { phone },
    include: { students: { select: { id: true } } },
  });

  if (existingParent) {
    // Update name if changed
    await prisma.parent.update({
      where: { id: existingParent.id },
      data: { fullName },
    });

    // Link to student if not already linked
    const alreadyLinked = existingParent.students.some((s) => s.id === studentId);
    if (!alreadyLinked) {
      await prisma.parent.update({
        where: { id: existingParent.id },
        data: { students: { connect: { id: studentId } } },
      });
    }
    result.parentsUpdated++;
  } else {
    // Create user account for this parent (username = phone)
    const passwordHash = await bcrypt.hash(phone.slice(-6), 10);

    const user = await prisma.user.create({
      data: {
        username: phone,
        password: passwordHash,
        role: 'PARENT',
      },
    });

    await prisma.parent.create({
      data: {
        userId: user.id,
        fullName,
        phone,
        students: { connect: { id: studentId } },
      },
    });

    result.parentsCreated++;
  }
}
