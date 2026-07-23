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
 * - /api/external — [DEPRECATED, AI Business OS Rewiring] server-to-server ingestion originally
 *   built for the cnbiz.ai.kr chatbot. Never confirmed to have a real caller (CHATBOT_API_KEY was
 *   never set in Production, so every request here would 401) — see REWIRING_REPORT.md. Customer
 *   intake has been rewired through the internal `POST /api/inquiries` exemption below instead.
 *   Kept ungated for now for backward compatibility only; scheduled for removal in a follow-up
 *   commit once that internal path is confirmed to be the sole intake route. /api/inquiries,
 *   /api/clients, /api/website-orders, /api/ai-jobs (the admin read/manage APIs over the same
 *   data) are deliberately NOT listed here and stay "developer"-gated by default, same reasoning
 *   as /api/requests below.
 *
 * /api/contact and /api/requests/submit used to be listed here (public Contact/Request form
 * submission endpoints) — both routes were deleted when CNBIZ.KR stopped taking website-creation
 * requests directly (see /contact and /request redirects in next.config.ts). GET /api/requests
 * and /api/requests/[id] remain admin-only ("developer" gate) for viewing historical submissions.
 * /contact was restored (AI Business OS Rewiring) as a direct customer intake form; see the exact
 * (method, path) exemption below instead of a prefix, since GET /api/inquiries (admin listing)
 * and PATCH /api/inquiries/[id] must stay "developer"-gated.
 */
const UNGATED_API_PREFIXES = [
  "/api/auth",
  "/api/workspaces",
  "/api/terminal",
  "/api/devserver",
  "/api/projects",
  "/api/external",
];

/**
 * Exact (method, path) pairs that must stay reachable without role gating even though their path
 * prefix is otherwise role-gated. Method-scoped (not a prefix) so sibling routes/methods on the
 * same path stay protected — POST /api/inquiries (public contact-form / manual-entry intake,
 * AI Business OS Rewiring) is ungated here, but GET /api/inquiries (admin listing) and
 * PATCH /api/inquiries/[id] are untouched and remain "developer"-gated.
 */
const UNGATED_EXACT_ROUTES: ReadonlyArray<{ method: string; path: string }> = [
  { method: "POST", path: "/api/inquiries" },
];

/**
 * Returns the protected area a request path belongs to, or null if it isn't role-gated.
 * Every /api/** route not explicitly exempted above is treated as belonging to the "developer"
 * area today, since every other current API route under this app is exclusively consumed by the
 * /developer dashboard (there is no /api/admin/** surface yet).
 *
 * `method` is optional so existing call sites/tests that only care about path-based gating keep
 * working; pass it whenever the caller (proxy.ts) actually knows the HTTP method, since that's
 * what UNGATED_EXACT_ROUTES matches against.
 */
export function resolveProtectedArea(pathname: string, method?: string): ProtectedArea | null {
  for (const [prefix, area] of PAGE_AREA_PREFIXES) {
    if (matchesPrefix(pathname, prefix)) return area;
  }

  if (pathname.startsWith("/api/")) {
    if (matchesPrefix(pathname, "/api/admin")) return "admin";
    if (
      method &&
      UNGATED_EXACT_ROUTES.some((route) => route.method === method && route.path === pathname)
    ) {
      return null;
    }
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
