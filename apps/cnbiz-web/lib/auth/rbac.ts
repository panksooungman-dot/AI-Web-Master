import type { Role } from "./types";

/**
 * Release Hardening (v1.0) — RBAC. Pure logic, no fs/next dependency, so it can be unit-tested
 * directly and reused by both proxy.ts (route protection) and any UI that needs to know what the
 * current user is allowed to see (e.g. DeveloperNav).
 *
 * "admin" is a protected area that has no page yet in this app (no /admin/** route exists) — the
 * matrix and resolveProtectedArea() below are still wired up so that whenever /admin/** pages are
 * introduced, they are protected from day one without touching this file again.
 */

export type ProtectedArea = "developer" | "admin";

/** Which roles may access which protected area. super_admin has both; user has neither. */
const AREA_ROLES: Record<ProtectedArea, Role[]> = {
  developer: ["developer", "super_admin"],
  admin: ["admin", "super_admin"],
};

export function roleCanAccessArea(role: Role, area: ProtectedArea): boolean {
  return AREA_ROLES[area].includes(role);
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const PAGE_AREA_PREFIXES: ReadonlyArray<readonly [string, ProtectedArea]> = [
  ["/admin", "admin"],
  ["/developer", "developer"],
];

/**
 * API routes that must stay reachable without role gating:
 * - /api/auth — needed to log in at all (and to check/clear a session pre-auth)
 * - /api/workspaces, /api/terminal, /api/devserver — documented CLI-compatibility exception
 *   (CHANGELOG 2026-07-14): these were deliberately left unprotected because packages/cli
 *   ("ai devmode" etc.) and generated projects' dev tooling call them without a browser session.
 *   Preserved as-is here rather than re-litigated as part of this hardening pass.
 * - /api/projects — backs the /projects page, which is intentionally outside this RBAC's scope
 *   (any authenticated user, not gated by role).
 * - /api/contact — backs the public /contact page's submission form (release-readiness fix):
 *   anonymous site visitors submit this with no session, so gating it behind "developer" made
 *   the production contact form unusable for real visitors.
 * - /api/requests/submit — backs the public /request page's submission form, same reasoning as
 *   /api/contact above. Deliberately NOT "/api/requests" itself (prefix match would also ungate
 *   it) — GET /api/requests and /api/requests/[id] list/manage submissions with customer PII and
 *   must stay admin-only (the default "developer" gate for any /api/** path not listed here).
 * - /api/external — server-to-server ingestion from the cnbiz.ai.kr chatbot (no browser session
 *   possible). Ungating here only removes the role check; the routes under this prefix must call
 *   lib/auth/apiKey.ts's verifyExternalApiKey() themselves, or they become fully public with no
 *   auth at all. /api/inquiries, /api/clients, /api/website-orders, /api/ai-jobs (the admin
 *   read/manage APIs over the same data) are deliberately NOT listed here and stay
 *   "developer"-gated by default, same reasoning as /api/requests above.
 */
const UNGATED_API_PREFIXES = [
  "/api/auth",
  "/api/workspaces",
  "/api/terminal",
  "/api/devserver",
  "/api/projects",
  "/api/contact",
  "/api/requests/submit",
  "/api/external",
];

/**
 * Returns the protected area a request path belongs to, or null if it isn't role-gated.
 * Every /api/** route not explicitly exempted above is treated as belonging to the "developer"
 * area today, since every other current API route under this app is exclusively consumed by the
 * /developer dashboard (there is no /api/admin/** surface yet).
 */
export function resolveProtectedArea(pathname: string): ProtectedArea | null {
  for (const [prefix, area] of PAGE_AREA_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return area;
  }

  if (pathname.startsWith("/api/")) {
    if (matchesPrefix(pathname, "/api/admin")) return "admin";
    if (UNGATED_API_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))) return null;
    return "developer";
  }

  return null;
}

/** Where to send a user immediately after login (or when visiting /login while already logged in). */
export function defaultLandingPathForRole(role: Role): string {
  if (role === "super_admin" || role === "developer") return "/developer";
  if (role === "admin") return "/admin";
  return "/";
}
