import type { NextRequest } from "next/server";
import { findUserById, toPublicUser } from "./users";
import { getValidSession, SESSION_COOKIE_NAME } from "./session";
import type { PublicUser } from "./types";

/**
 * "Requires login, but no specific role" paths. /developer and /admin are handled separately by
 * lib/auth/rbac.ts's resolveProtectedArea() (role-gated, release hardening v1.0) — /projects is
 * intentionally left out of that RBAC scope (any authenticated user, regardless of role).
 */
export const PROTECTED_PREFIXES = ["/projects"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Resolves the logged-in user (if any) from the session cookie on an
 * incoming request. Used by proxy.ts (route protection) and by
 * GET /api/auth/me (to report the current session over HTTP).
 */
export function resolveSessionUser(request: NextRequest, baseDir?: string): PublicUser | null {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = getValidSession(sessionId, baseDir);
  if (!session) return null;

  const user = findUserById(session.userId, baseDir);
  return user ? toPublicUser(user) : null;
}
