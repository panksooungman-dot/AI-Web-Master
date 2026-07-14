import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedPath, resolveSessionUser } from "@/lib/auth/middleware";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const user = resolveSessionUser(request);

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/developer", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/developer/:path*", "/projects/:path*", "/login"],
};
