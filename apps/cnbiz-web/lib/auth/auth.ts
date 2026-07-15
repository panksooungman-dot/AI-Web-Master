import { findUserByEmail, findUserById, toPublicUser } from "./users";
import { verifyPassword } from "./password";
import { createSession, destroySession, getValidSession } from "./session";
import type { PublicUser, SessionRecord } from "./types";
import type { CollectionStore } from "@/lib/db/collectionStore";

export interface LoginResult {
  user: PublicUser;
  session: SessionRecord;
}

export interface LoginError {
  error: string;
}

/**
 * `store` is only ever overridden in tests, to keep them off real data. Provider-agnostic on
 * purpose: an OAuth flow can call createSession() from lib/auth/session.ts directly (after
 * verifying identity its own way) without touching this password-specific function.
 */
export async function login(
  email: string,
  password: string,
  store?: CollectionStore
): Promise<LoginResult | LoginError> {
  const user = await findUserByEmail(email, store);

  // Same error message for "no such user" and "wrong password" to avoid
  // leaking which emails are registered.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const session = await createSession(user.id, store);
  return { user: toPublicUser(user), session };
}

export async function logout(sessionId: string, store?: CollectionStore): Promise<void> {
  await destroySession(sessionId, store);
}

export async function getCurrentUser(
  sessionId: string | undefined,
  store?: CollectionStore
): Promise<PublicUser | null> {
  if (!sessionId) return null;

  const session = await getValidSession(sessionId, store);
  if (!session) return null;

  const user = await findUserById(session.userId, store);
  return user ? toPublicUser(user) : null;
}
