import crypto from "crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Format kept in sync with scripts/create-auth-user.js (same scrypt params) so
 * hashes created by either path are interchangeable.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const candidate = crypto.scryptSync(password, salt, KEY_LENGTH);

  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}
