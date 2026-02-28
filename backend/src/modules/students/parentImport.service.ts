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
 * Optimized: bulk DB queries + parallel bcrypt hashing.
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

  // Fetch all students for matching (single query)
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

  // --- OPTIMIZED IMPORT MODE ---
  // 1. Collect all unique phone numbers needed
  const parentEntries: { studentId: string; fullName: string; phone: string; rowNum: string }[] = [];
  for (const row of rows) {
    const student = studentByNumber.get(row.schoolNumber);
    if (!student) continue;
    if (row.parent1Name && row.parent1Phone) {
      parentEntries.push({ studentId: student.id, fullName: row.parent1Name, phone: row.parent1Phone, rowNum: row.schoolNumber });
    }
    if (row.parent2Name && row.parent2Phone) {
      parentEntries.push({ studentId: student.id, fullName: row.parent2Name, phone: row.parent2Phone, rowNum: row.schoolNumber });
    }
  }

  // 2. Bulk fetch all existing parents by phone (single query instead of N queries)
  const uniquePhones = [...new Set(parentEntries.map((e) => e.phone))];
  const existingParents = await prisma.parent.findMany({
    where: { phone: { in: uniquePhones } },
    include: { students: { select: { id: true } } },
  });
  const parentByPhone = new Map(existingParents.map((p) => [p.phone, p]));

  // 3. Separate new vs existing parents
  const newParentPhones = new Set<string>();
  const newEntries: typeof parentEntries = [];
  const existingEntries: typeof parentEntries = [];

  for (const entry of parentEntries) {
    if (parentByPhone.has(entry.phone)) {
      existingEntries.push(entry);
    } else {
      newEntries.push(entry);
      newParentPhones.add(entry.phone);
    }
  }

  // 4. Pre-hash all passwords in parallel (biggest perf win: ~100ms each → all at once)
  const phonesNeedingHash = [...newParentPhones];
  const hashResults = await Promise.all(
    phonesNeedingHash.map((phone) => bcrypt.hash(phone.slice(-6), 10))
  );
  const hashByPhone = new Map(phonesNeedingHash.map((phone, i) => [phone, hashResults[i]]));

  // 5. Process all in a single transaction
  await prisma.$transaction(async (tx) => {
    // 5a. Update existing parents + link to students
    for (const entry of existingEntries) {
      try {
        const existing = parentByPhone.get(entry.phone)!;
        await tx.parent.update({
          where: { id: existing.id },
          data: { fullName: entry.fullName },
        });
        const alreadyLinked = existing.students.some((s) => s.id === entry.studentId);
        if (!alreadyLinked) {
          await tx.parent.update({
            where: { id: existing.id },
            data: { students: { connect: { id: entry.studentId } } },
          });
          // Update local cache so subsequent entries for same parent know about this link
          existing.students.push({ id: entry.studentId });
        }
        result.parentsUpdated++;
      } catch (err: any) {
        result.errors.push(`${entry.rowNum} Veli: ${err.message}`);
      }
    }

    // 5b. Create new parents (user + parent + link) — password already hashed
    const createdParentByPhone = new Map<string, { id: string; students: { id: string }[] }>();
    for (const entry of newEntries) {
      try {
        // If this phone was already created in an earlier iteration, just link
        const alreadyCreated = createdParentByPhone.get(entry.phone);
        if (alreadyCreated) {
          const alreadyLinked = alreadyCreated.students.some((s) => s.id === entry.studentId);
          if (!alreadyLinked) {
            await tx.parent.update({
              where: { id: alreadyCreated.id },
              data: { students: { connect: { id: entry.studentId } } },
            });
            alreadyCreated.students.push({ id: entry.studentId });
          }
          result.parentsUpdated++;
          continue;
        }

        const passwordHash = hashByPhone.get(entry.phone)!;
        const user = await tx.user.create({
          data: {
            username: entry.phone,
            password: passwordHash,
            role: 'PARENT',
          },
        });
        const newParent = await tx.parent.create({
          data: {
            userId: user.id,
            fullName: entry.fullName,
            phone: entry.phone,
            students: { connect: { id: entry.studentId } },
          },
        });
        createdParentByPhone.set(entry.phone, { id: newParent.id, students: [{ id: entry.studentId }] });
        result.parentsCreated++;
      } catch (err: any) {
        result.errors.push(`${entry.rowNum} Veli: ${err.message}`);
      }
    }
  });

  return result;
}
