import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedPath, resolveSessionUser } from "@/lib/auth/middleware";
import { defaultLandingPathForRole, resolveProtectedArea, roleCanAccessArea } from "@/lib/auth/rbac";

/**
 * Release Hardening (v1.0) — RBAC route protection. /developer/** and /admin/** (plus every
 * /api/** route that isn't explicitly exempted in rbac.ts) require a role that
 * lib/auth/rbac.ts's access matrix allows for that area:
 *   user         → 403 on both /developer and /admin
 *   developer    → /developer only
 *   admin        → /admin only
 *   super_admin  → both
 * /admin/** has no pages yet in this app — the check is wired up so it protects that area from
 * the moment pages are added there, without touching this file again.
 *
 * The `else if` branch below handles lib/auth/middleware.ts's separate "login required, any
 * role" list (PROTECTED_PREFIXES) — /projects (pages) plus /api/terminal and /api/workspaces
 * (Release Blocker fix, Release Readiness Audit). It mirrors the isApi 401-JSON-vs-redirect
 * split already used in the role-gated branch above, so an anonymous request to a
 * PROTECTED_PREFIXES API path gets 401 JSON like every other gated API instead of a
 * page-oriented redirect.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = await resolveSessionUser(request);
  const isApi = pathname.startsWith("/api/");
  const requiredArea = resolveProtectedArea(pathname, request.method);

  if (requiredArea) {
    if (!user) {
      if (isApi) {
        return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!roleCanAccessArea(user.role, requiredArea)) {
      if (isApi) {
        return NextResponse.json(
          { success: false, error: "이 리소스에 접근할 권한이 없습니다." },
          { status: 403 }
        );
      }
      return new NextResponse("접근 권한이 없습니다. (403 Forbidden)", { status: 403 });
    }
  } else if (isProtectedPath(pathname) && !user) {
    if (isApi) {
      return NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL(defaultLandingPathForRole(user.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/developer/:path*",
    "/admin/:path*",
    "/customer/:path*",
    "/projects/:path*",
    "/login",
    "/api/:path*",
  ],
};
