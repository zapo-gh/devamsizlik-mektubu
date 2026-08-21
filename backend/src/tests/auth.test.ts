import { describe, it, expect } from 'vitest';
import { passwordSchema } from '../modules/shared/security/passwordPolicy';

describe('Password policy', () => {
  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('Abc123').success).toBe(false);
  });

  it('rejects passwords without a digit', () => {
    expect(passwordSchema.safeParse('GuvenliParola').success).toBe(false);
  });

  it('accepts a strong password', () => {
    expect(passwordSchema.safeParse('GuvenliParola2026').success).toBe(true);
  });
});
