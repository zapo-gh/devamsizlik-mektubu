import { z } from 'zod';

/**
 * Password policy for newly created/changed passwords.
 * Existing hashes remain valid so deployments do not force a bulk reset.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Şifre en az 10 karakter olmalıdır.')
  .max(128, 'Şifre en fazla 128 karakter olabilir.')
  .refine((value) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value), {
    message: 'Şifre en az bir harf içermelidir.',
  })
  .refine((value) => /\d/.test(value), {
    message: 'Şifre en az bir rakam içermelidir.',
  });
