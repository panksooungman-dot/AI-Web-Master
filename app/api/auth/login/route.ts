import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { login } from "@/lib/auth/auth";
import { sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "요청 본문을 읽을 수 없습니다." },
      { status: 400 }
    );
  }

  const email = isRecord(body) && typeof body.email === "string" ? body.email.trim() : "";
  const password = isRecord(body) && typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: "이메일과 비밀번호를 모두 입력하세요." },
      { status: 400 }
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { success: false, error: "올바른 이메일 형식이 아닙니다." },
      { status: 400 }
    );
  }

  const result = login(email, password);

  if ("error" in result) {
    return NextResponse.json({ success: false, error: result.error }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    result.session.id,
    sessionCookieOptions(result.session.expiresAt)
  );

  return NextResponse.json({ success: true, user: result.user });
}
