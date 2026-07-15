import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser, logout } from "@/lib/auth/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/audit/log";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    const user = await getCurrentUser(sessionId);
    await logout(sessionId);
    await recordAuditEvent({ action: "auth.logout", actor: user?.email ?? null, success: true, detail: "로그아웃" });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);

  return NextResponse.json({ success: true });
}
