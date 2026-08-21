import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword, normalizePhone, parseParentExcel } from './parentImport.service';
import * as XLSX from 'xlsx';

describe('parentImport.service', () => {
  it('normalizes common Turkish phone formats', () => {
    expect(normalizePhone('+90 532 123 45 67')).toBe('05321234567');
    expect(normalizePhone('905321234567')).toBe('05321234567');
    expect(normalizePhone('5321234567')).toBe('05321234567');
    expect(normalizePhone('0532-123-45-67')).toBe('05321234567');
  });

  it('generates high-entropy temporary passwords that are not derived from the phone number', () => {
    const passwordA = generateTemporaryPassword();
    const passwordB = generateTemporaryPassword();

    expect(passwordA).toHaveLength(16);
    expect(passwordB).toHaveLength(16);
    expect(passwordA).not.toBe(passwordB);
    expect(passwordA).not.toBe('123456');
  });

  it('parses parent rows and ignores empty parent rows', () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Okul No', 'Öğrenci', 'Sınıf', 'Veli 1 Telefon', 'Veli 1 Ad', 'Yakınlık', 'Veli 2 Telefon', 'Veli 2 Ad'],
      ['100', 'Ayşe Yılmaz', '9/A', '05321234567', 'Mehmet Yılmaz', 'Baba', '', ''],
      ['101', 'Boş Kayıt', '9/B', '', '', '', '', ''],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Veliler');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const rows = parseParentExcel(buffer);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      schoolNumber: '100',
      studentName: 'Ayşe Yılmaz',
      className: '9/A',
      parent1Name: 'Mehmet Yılmaz',
      parent1Phone: '05321234567',
      parent1Relation: 'Baba',
    });
  });
});
