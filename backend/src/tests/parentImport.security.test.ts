import { describe, expect, it } from 'vitest';
import { generateTemporaryPassword, normalizePhone } from '../modules/students/parentImport.service';

describe('Parent import security', () => {
  it('normalizes common Turkish mobile formats', () => {
    expect(normalizePhone('+90 532 123 45 67')).toBe('05321234567');
    expect(normalizePhone('532 123 45 67')).toBe('05321234567');
    expect(normalizePhone('0532-123-45-67')).toBe('05321234567');
  });

  it('does not derive temporary passwords from phone numbers', () => {
    const phone = '05321234567';
    const password = generateTemporaryPassword();

    expect(password).not.toBe(phone.slice(-6));
    expect(password.length).toBeGreaterThanOrEqual(16);
  });

  it('generates different temporary passwords', () => {
    expect(generateTemporaryPassword()).not.toBe(generateTemporaryPassword());
  });
});
