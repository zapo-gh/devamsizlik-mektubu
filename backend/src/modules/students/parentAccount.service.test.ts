import { describe, expect, it } from 'vitest';
import { generateParentTemporaryPassword, normalizeParentPhone } from './parentAccount.service';

describe('parentAccount.service', () => {
  it('normalizes supported Turkish mobile formats to one canonical value', () => {
    expect(normalizeParentPhone('+90 532 123 45 67')).toBe('05321234567');
    expect(normalizeParentPhone('905321234567')).toBe('05321234567');
    expect(normalizeParentPhone('5321234567')).toBe('05321234567');
    expect(normalizeParentPhone('0532-123-45-67')).toBe('05321234567');
  });

  it('rejects invalid or non-mobile numbers', () => {
    expect(() => normalizeParentPhone('02121234567')).toThrow();
    expect(() => normalizeParentPhone('532123456')).toThrow();
    expect(() => normalizeParentPhone('')).toThrow();
  });

  it('generates independent temporary credentials', () => {
    const first = generateParentTemporaryPassword();
    const second = generateParentTemporaryPassword();
    expect(first).toHaveLength(16);
    expect(second).toHaveLength(16);
    expect(first).not.toBe(second);
  });
});
