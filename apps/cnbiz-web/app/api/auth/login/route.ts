import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { login } from "@/lib/auth/auth";
import { sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/audit/log";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  console.log("[api/auth/login] POST hit", {
    method: request.method,
    url: request.url,
    contentType: request.headers.get("content-type"),
  });

  let body: unknown;

  try {
    body = await request.json();
  } catch (err) {
    console.error("[api/auth/login] request.json failed", err);
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = isRecord(body) && typeof body.email === "string" ? body.email.trim() : "";
  const password = isRecord(body) && typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    console.warn("[api/auth/login] missing email or password", {
      hasEmail: Boolean(email),
      hasPassword: Boolean(password),
    });
    return NextResponse.json(
      { success: false, error: "이메일과 비밀번호를 모두 입력하세요." },
      { status: 400 }
    );
  }

  if (!EMAIL_PATTERN.test(email)) {
    console.warn("[api/auth/login] invalid email format");
    return NextResponse.json(
      { success: false, error: "올바른 이메일 형식이 아닙니다." },
      { status: 400 }
    );
  }

  let result: Awaited<ReturnType<typeof login>>;

  try {
    result = await login(email, password);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // getDefaultStore()(lib/db/index.ts)의 fail-fast 가드는 Production에서 Supabase
    // 환경변수가 없으면 이 메시지 prefix로 throw한다 — 서버 코드/스토리지 자체의 결함이
    // 아니라 배포 설정 누락이므로, 원인 불명 500 대신 즉시 진단 가능한 4xx로 구분해 응답한다.
    if (message.startsWith("[Production misconfig]")) {
      console.error("[api/auth/login] Supabase misconfigured", {
        message,
        hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
        hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      });
      return NextResponse.json(
        { success: false, error: "서버 설정 오류로 로그인을 처리할 수 없습니다. 관리자에게 문의하세요." },
        { status: 400 }
      );
    }

    // A storage-layer failure here (e.g. Supabase env vars missing in this environment,
    // so getDefaultStore() fell back to the fs store, which can't write on a read-only
    // production filesystem) must not crash the route with an opaque 500 — log the real
    // cause server-side (visible in Vercel function logs) and return a diagnosable error.
    console.error("[api/auth/login] login() threw", {
      message,
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
      hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    return NextResponse.json(
      { success: false, error: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }

  // Audit logging is a side effect of login, not the login itself — a failure writing to the
  // audit-log collection must never turn an otherwise-successful (or otherwise-rejected) login
  // response into an unhandled 500.
  const logLoginAttempt = (actor: string, success: boolean, detail: string) =>
    recordAuditEvent({ action: "auth.login", actor, success, detail }).catch((error) => {
      console.error("[api/auth/login] recordAuditEvent failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    });

  if ("error" in result) {
    await logLoginAttempt(email, false, result.error);
    return NextResponse.json({ success: false, error: result.error }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    result.session.id,
    sessionCookieOptions(result.session.expiresAt)
  );

  await logLoginAttempt(result.user.email, true, "로그인 성공");

  return NextResponse.json({ success: true, user: result.user });
}
