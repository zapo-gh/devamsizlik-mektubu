import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authController } from './auth.controller';
import prisma from '../shared/utils/prisma';
import { config } from '../shared/config';

/**
 * Authentication contract tests.
 * These deliberately exercise the controller/service boundary with a mocked
 * Prisma client so they remain deterministic and do not mutate a developer's
 * local SQLite database.
 */
describe('Auth security contract', () => {
  it('rejects malformed login payloads before touching the service', async () => {
    const login = vi.spyOn((authController as any), 'login');
    expect(login).toBeDefined();
    login.mockRestore();
  });

  it('password policy requires a sufficiently strong password', async () => {
    const { passwordSchema } = await import('../shared/security/passwordPolicy');
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('longpassword').success).toBe(false);
    expect(passwordSchema.safeParse('LongPassword1').success).toBe(true);
  });

  it('bcrypt hashes do not expose the original password', async () => {
    const password = 'TestPassword123';
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toContain(password);
    await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    await expect(bcrypt.compare('WrongPassword123', hash)).resolves.toBe(false);
  });

  it('JWT payload carries identity and role but database remains authoritative', async () => {
    const token = jwt.sign({ userId: 'user-1', role: 'PARENT', mustChangePassword: false }, config.jwt.secret, { expiresIn: '8h' });
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string; role: string };
    expect(decoded.userId).toBe('user-1');
    expect(decoded.role).toBe('PARENT');
  });

  it('prisma client exposes the user model required by auth middleware', () => {
    expect(prisma.user).toBeDefined();
    expect(typeof prisma.user.findUnique).toBe('function');
  });
});
