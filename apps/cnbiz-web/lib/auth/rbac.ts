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

export type ProtectedArea = "developer" | "admin" | "customer";

/**
 * Which roles may access which protected area. super_admin has developer+admin+customer (superset
 * role, same pattern as before); "customer" is its own area, not a superset/subset of
 * developer/admin — a customer account never gains developer/admin access, and vice versa.
 */
const AREA_ROLES: Record<ProtectedArea, Role[]> = {
  developer: ["developer", "super_admin"],
  admin: ["admin", "super_admin"],
  customer: ["customer", "super_admin"],
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
  ["/customer", "customer"],
];

/**
 * API routes that must stay reachable without role gating:
 * - /api/auth — needed to log in at all (and to check/clear a session pre-auth)
 * - /api/workspaces, /api/terminal — Release Blocker fix (Release Readiness Audit): the
 *   CLI-compatibility justification previously documented here does not hold up against the
 *   code — packages/cli spawns dev servers directly and never calls these Next.js API routes
 *   (verified: no reference anywhere under packages/cli). The actual callers are this app's own
 *   browser pages: /projects and /projects/[id] (lib/projects/status.ts's fetchGitStatus(), any
 *   authenticated role — /projects is intentionally outside RBAC's role scope, see
 *   lib/auth/middleware.ts) and /developer/workspace (developer role). Since /projects allows
 *   any authenticated role, these two routes cannot be role-gated here without breaking that
 *   page for non-developer users — instead they are login-gated (any role) via
 *   lib/auth/middleware.ts's PROTECTED_PREFIXES, which proxy.ts checks. They stay in this
 *   ungated-by-role list on purpose; they are not anonymous-reachable anymore.
 * - /api/devserver — same audit found ONLY /developer's DevServerManagerCard calls this (developer
 *   role only, no /projects usage) — removed from this list, now falls through to the default
 *   "developer" area below like any other unlisted /api/** route.
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
  "/api/projects",
  "/api/external",
  // Inquiry 첨부파일 서빙(lib/uploads/storage.ts의 fs 폴백 경로). Supabase Storage를 쓰는
  // 경우와 동일하게 "공개적으로 fetch 가능한 URL"이어야 하고, AI Analysis의 비전 분석
  // (lib/ai-analysis/vision.ts)이 세션 쿠키 없이 서버-투-서버로 이 URL을 직접 fetch하므로
  // 로그인 게이트를 걸면 그 경로가 항상 실패한다.
  "/api/uploads",
  // Visual Editor(@cnbiz/dev-inspector)의 save-text/save-image/save-style/open-in-editor.
  // 이 오버레이는 공개 마케팅 페이지(/) 미리보기 위에서 로그인 없이 쓰는 로컬 전용 도구라,
  // "developer" role 로그인을 요구하면 실사용 경로가 항상 401로 막힌다(실제 재현 확인).
  // 각 핸들러가 이미 자체적으로 `NODE_ENV !== "development"`면 403을 반환하므로 프로덕션
  // 노출 위험은 없고, 로컬 dev 서버에 접근 가능하다는 것 자체가 이미 그 프로젝트 파일시스템
  // 전체에 접근 가능하다는 뜻이라 RBAC로 추가 보호할 실익도 없다.
  "/api/dev-inspector",
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
    // Customer Portal V1 — GET /api/customer/orders, GET /api/customer/orders/[id]. Without this
    // check these would fall through to the catch-all "developer" area below (every unlisted
    // /api/** route defaults to developer-gated) and no customer account could ever reach them.
    if (matchesPrefix(pathname, "/api/customer")) return "customer";
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
  if (role === "customer") return "/customer/dashboard";
  return "/";
}
