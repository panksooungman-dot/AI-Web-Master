import { findUserByEmail, findUserById, toPublicUser } from "./users";
import { verifyPassword } from "./password";
import { createSession, destroySession, getValidSession } from "./session";
import type { PublicUser, SessionRecord } from "./types";

export interface LoginResult {
  user: PublicUser;
  session: SessionRecord;
}

export interface LoginError {
  error: string;
}

/**
 * baseDir is only ever overridden in tests, to keep them off real lib/data/*.json.
 * Provider-agnostic on purpose: an OAuth flow can call createSession() from
 * lib/auth/session.ts directly (after verifying identity its own way) without
 * touching this password-specific function.
 */
export function login(
  email: string,
  password: string,
  baseDir?: string
): LoginResult | LoginError {
  const user = findUserByEmail(email, baseDir);

  // Same error message for "no such user" and "wrong password" to avoid
  // leaking which emails are registered.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const session = createSession(user.id, baseDir);
  return { user: toPublicUser(user), session };
}

export function logout(sessionId: string, baseDir?: string): void {
  destroySession(sessionId, baseDir);
}

export function getCurrentUser(sessionId: string | undefined, baseDir?: string): PublicUser | null {
  if (!sessionId) return null;

  const session = getValidSession(sessionId, baseDir);
  if (!session) return null;

  const user = findUserById(session.userId, baseDir);
  return user ? toPublicUser(user) : null;
}
