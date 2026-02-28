import * as XLSX from 'xlsx';
import prisma from '../shared/utils/prisma';

interface ParsedStudent {
  schoolNumber: string;
  fullName: string;
  className: string;
}

interface ImportResult {
  totalParsed: number;
  created: number;
  skipped: number;
  errors: string[];
  students: ParsedStudent[];
}

/**
 * Parse the Excel file exported from e-Okul / school system.
 *
 * Expected layout (repeating per class):
 *   Row header (merged): "...AMP - 9. Sınıf / A Şubesi (ALAN ADI) Sınıf Listesi"
 *   Row "Sınıf Öğretmeni: ..."
 *   Row "Sınıf Müdür Yrd: ..."
 *   Row column headers: S.No | Öğrenci No | Adı | Soyadı | Cinsiyeti | Pansiyon Durum
 *   Data rows...
 *   (then next class starts with a new header row)
 *
 * Column mapping (0-indexed):
 *   A (0): S.No
 *   B (1): Öğrenci No
 *   C (2): Adı (first name)  — may span merged columns
 *   H (7): Soyadı (last name) — may span merged columns
 *
 * The class name is extracted from the header row that contains "Sınıf" and "Şubesi".
 */
export function parseExcelFile(buffer: Buffer): ParsedStudent[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allStudents: ParsedStudent[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Get raw row data as arrays (no header mapping)
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: true,
    });

    let currentClassName = '';

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      // Join entire row to detect class header
      const rowText = row.map((c: any) => String(c ?? '')).join(' ');

      // Detect class header row: contains "Sınıf" and "Şubesi" or "Sınıf Listesi"
      if (rowText.includes('Sınıf Listesi') || (rowText.includes('Sınıf') && rowText.includes('Şubesi'))) {
        currentClassName = extractClassName(rowText);
        continue;
      }

      // Skip meta rows (teacher, vice principal, column headers)
      const firstCell = String(row[0] ?? '').trim();
      if (
        firstCell === '' ||
        firstCell === 'S.No' ||
        firstCell === 'S.no' ||
        rowText.includes('Sınıf Öğretmeni') ||
        rowText.includes('Sınıf Müdür') ||
        rowText.includes('Sınıf Başkan')
      ) {
        continue;
      }

      // Try to parse as student data row
      const sNo = parseInt(String(row[0] ?? ''), 10);
      if (isNaN(sNo)) continue; // Not a data row

      const schoolNumber = String(row[1] ?? '').trim();
      if (!schoolNumber) continue;

      // Name columns: look for first name and last name
      // Based on the Excel layout, Adı is around column C (index 2-6), Soyadı around column H (index 7-9)
      const firstName = findNameValue(row, 2, 7);  // columns C through G
      const lastName = findNameValue(row, 7, 11);   // columns H through K

      if (!firstName && !lastName) continue;

      const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
      if (!fullName) continue;

      allStudents.push({
        schoolNumber,
        fullName,
        className: currentClassName || 'Bilinmiyor',
      });
    }
  }

  return allStudents;
}

/**
 * Extract class name like "9/A" from header text.
 * Input example: "...AMP - 9. Sınıf / A Şubesi (SAĞLIK HİZMETLERİ ALANI) Sınıf Listesi"
 * Output: "9/A"
 */
function extractClassName(text: string): string {
  // Pattern: "X. Sınıf / Y Şubesi"
  const match = text.match(/(\d+)\.\s*S\u0131n\u0131f\s*\/\s*([A-Za-z\u00C0-\u024F\u0100-\u017F]+)\s*\u015Eubesi/i);
  if (match) {
    return `${match[1]}/${match[2].toUpperCase()}`;
  }

  // Fallback: try simpler pattern
  const simpleMatch = text.match(/(\d+)\s*\/\s*([A-Za-z])\b/);
  if (simpleMatch) {
    return `${simpleMatch[1]}/${simpleMatch[2].toUpperCase()}`;
  }

  return text.slice(0, 30).trim();
}

/**
 * Find the first non-empty string value in a range of columns.
 * Excel merged cells may place the value only in the first column of the merge.
 */
function findNameValue(row: any[], startCol: number, endCol: number): string {
  const parts: string[] = [];
  for (let c = startCol; c < endCol && c < row.length; c++) {
    const val = String(row[c] ?? '').trim();
    if (val && val !== '0' && isNaN(Number(val))) {
      parts.push(val);
    }
  }
  return parts.join(' ').trim();
}

/**
 * Import parsed students into the database.
 * Uses upsert: if schoolNumber exists, update; otherwise create.
 */
export async function importStudents(
  students: ParsedStudent[],
  mode: 'preview' | 'import' = 'import'
): Promise<ImportResult> {
  const result: ImportResult = {
    totalParsed: students.length,
    created: 0,
    skipped: 0,
    errors: [],
    students,
  };

  if (mode === 'preview') {
    return result;
  }

  for (const student of students) {
    try {
      const existing = await prisma.student.findUnique({
        where: { schoolNumber: student.schoolNumber },
      });

      if (existing) {
        // Update name/class if changed
        await prisma.student.update({
          where: { schoolNumber: student.schoolNumber },
          data: {
            fullName: student.fullName,
            className: student.className,
          },
        });
        result.skipped++;
      } else {
        await prisma.student.create({
          data: {
            schoolNumber: student.schoolNumber,
            fullName: student.fullName,
            className: student.className,
          },
        });
        result.created++;
      }
    } catch (error: any) {
      result.errors.push(
        `${student.schoolNumber} - ${student.fullName}: ${error.message}`
      );
    }
  }

  return result;
}
