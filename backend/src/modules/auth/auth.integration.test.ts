import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { passwordSchema } from '../shared/security/passwordPolicy';

const TEST_JWT_SECRET = 'test-only-jwt-secret-that-is-at-least-32-characters-long';

describe('Auth security contract', () => {
  it('rejects passwords that do not meet the minimum policy', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longpassword').success).toBe(false);
    expect(passwordSchema.safeParse('LongPassword1').success).toBe(true);
  });

  it('bcrypt hashes verify correctly without exposing the password', async () => {
    const password = 'TestPassword123';
    const hash = await bcrypt.hash(password, 12);

    expect(hash).not.toContain(password);
    await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    await expect(bcrypt.compare('WrongPassword123', hash)).resolves.toBe(false);
  });

  it('JWT preserves identity and role claims', () => {
    const token = jwt.sign(
      { userId: 'user-1', role: 'PARENT', mustChangePassword: false },
      TEST_JWT_SECRET,
      { expiresIn: '8h' },
    );

    const decoded = jwt.verify(token, TEST_JWT_SECRET) as {
      userId: string;
      role: string;
      mustChangePassword: boolean;
    };

    expect(decoded.userId).toBe('user-1');
    expect(decoded.role).toBe('PARENT');
    expect(decoded.mustChangePassword).toBe(false);
  });

  it('tampered JWT is rejected', () => {
    const token = jwt.sign({ userId: 'user-1', role: 'PARENT' }, TEST_JWT_SECRET);
    const [header, payload] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'admin', role: 'ADMIN' })).toString('base64url');
    const tampered = `${header}.${tamperedPayload}.${token.split('.')[2]}`;

    expect(() => jwt.verify(tampered, TEST_JWT_SECRET)).toThrow();
  });
});
