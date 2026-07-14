import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * No-op passthrough. Without this file, Next.js's monorepo root detection
 * (see D:\ai-web-master\apps\cnbiz-web\next.config.ts history / build logs)
 * falls through to the root app's proxy.ts, which implements auth route
 * protection that has no meaning for this separate CNBIZ marketing site.
 * This file's only job is to exist so Next.js finds it locally instead.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}
