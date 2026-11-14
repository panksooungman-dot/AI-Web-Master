import { createHash } from "node:crypto";
import { getAuthConfig, isAdminRequest } from "./auth";
import { StoreNotReadyError } from "./store";
import type { ContractStore } from "./store";

/** 라우트 핸들러 공통 도우미: JSON 응답, 관리자 확인, 같은 출처 확인, 본문 읽기, 로그인 시도 제한. */

export const json = (data: unknown, status = 200, headers?: Record<string, string>): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

export const fail = (status: number, error: string, extra?: Record<string, unknown>): Response => json({ ok: false, error, ...extra }, status);

/** 관리자 세션이 아니면 401 응답, 맞으면 null. 매 요청마다 서버에서 검사한다. */
export function requireAdmin(request: Request): Response | null {
  const cfg = getAuthConfig();
  if (!cfg.configured) return fail(503, cfg.problem ?? "관리자 인증이 설정되지 않았습니다.");
  return isAdminRequest(request.headers.get("cookie"), cfg) ? null : fail(401, "로그인이 필요합니다.");
}

/**
 * 상태를 바꾸는 요청(POST/PUT/PATCH/DELETE)은 같은 출처에서 온 것만 받는다(CSRF 방어).
 * 브라우저는 Origin 또는 Sec-Fetch-Site를 항상 보낸다. 둘 다 없으면 거부한다.
 */
export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? new URL(request.url).host;
  if (origin) {
    try {
      if (host && new URL(origin).host === host) return null;
    } catch {
      /* fallthrough */
    }
    return fail(403, "허용되지 않은 요청입니다.");
  }
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "none") return null;
  return fail(403, "허용되지 않은 요청입니다.");
}

/** JSON 본문을 크기 제한 안에서 읽는다. 형식이 틀리면 Response를 돌려준다. */
export async function readJson(request: Request, maxBytes = 100_000): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return { ok: false, response: fail(415, "JSON 형식으로 보내 주세요.") };
  const len = Number(request.headers.get("content-length") || 0);
  if (len > maxBytes) return { ok: false, response: fail(413, "요청이 너무 큽니다.") };
  const text = await request.text();
  if (text.length > maxBytes) return { ok: false, response: fail(413, "요청이 너무 큽니다.") };
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, response: fail(400, "JSON을 읽을 수 없습니다.") };
  }
}

/** 핸들러 실행 중 저장소 오류는 503, 그 밖의 오류는 내용을 숨긴 500으로 바꾼다(개인정보를 로그에 남기지 않는다). */
export async function guarded(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof StoreNotReadyError) return fail(503, e.message);
    console.error("[contract-api] unexpected error:", e instanceof Error ? e.name : "unknown");
    return fail(500, "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export const clientKey = (request: Request): string => {
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
};

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/** 로그인 실패 횟수 제한: 15분 안에 5번 틀리면 15분간 잠근다. 남은 잠금 시간(초)을 돌려준다(0이면 시도 가능). */
export async function loginLockSeconds(store: ContractStore, key: string, now = Date.now()): Promise<number> {
  const a = await store.getAttempt("login:" + key);
  return a && a.lockedUntil > now ? Math.ceil((a.lockedUntil - now) / 1000) : 0;
}

export async function recordLoginFailure(store: ContractStore, key: string, now = Date.now()): Promise<void> {
  const k = "login:" + key;
  const a = await store.getAttempt(k);
  const fresh = !a || now - a.firstAt > WINDOW_MS;
  const count = fresh ? 1 : a.count + 1;
  await store.putAttempt({ key: k, count, firstAt: fresh ? now : a.firstAt, lockedUntil: count >= MAX_FAILS ? now + WINDOW_MS : 0 });
}

export const clearLoginFailures = (store: ContractStore, key: string): Promise<void> => store.clearAttempt("login:" + key);
