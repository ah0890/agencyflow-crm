import bcrypt from "bcryptjs";

/**
 * Password hashing. Cost 10 keeps local logins and the seed script fast while
 * still being a real bcrypt hash - plaintext passwords are never stored.
 */
const SALT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
