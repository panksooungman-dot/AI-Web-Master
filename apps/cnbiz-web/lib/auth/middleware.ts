import type { NextRequest } from "next/server";
import { findUserById, toPublicUser } from "./users";
import { getValidSession, SESSION_COOKIE_NAME } from "./session";
import type { PublicUser } from "./types";
import type { CollectionStore } from "@/lib/db/collectionStore";

/**
 * "Requires login, but no specific role" paths. /developer and /admin are handled separately by
 * lib/auth/rbac.ts's resolveProtectedArea() (role-gated, release hardening v1.0) — /projects is
 * intentionally left out of that RBAC scope (any authenticated user, regardless of role).
 *
 * /api/terminal and /api/workspaces (Release Blocker fix, Release Readiness Audit) were added
 * here rather than to lib/auth/rbac.ts's role matrix: both are called by /projects and
 * /projects/[id] (any authenticated role, not developer-gated — see lib/projects/status.ts and
 * app/projects/page.tsx), so role-gating them as "developer" would break that page for
 * non-developer users. Login-only gating closes the previously-anonymous-reachable hole without
 * changing who /projects already lets in.
 */
export const PROTECTED_PREFIXES = ["/projects", "/api/terminal", "/api/workspaces"];

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
export async function resolveSessionUser(
  request: NextRequest,
  store?: CollectionStore
): Promise<PublicUser | null> {
  const sessionId = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const session = await getValidSession(sessionId, store);
  if (!session) return null;

  const user = await findUserById(session.userId, store);
  return user ? toPublicUser(user) : null;
}
