import { timingSafeEqual } from "crypto";

const HEADER_NAME = "x-api-key";

/**
 * @deprecated AI Business OS Rewiring (see REWIRING_REPORT.md) — CHATBOT_API_KEY was never
 * configured in Production, so verifyExternalApiKey() has returned false for every request there
 * since this file was introduced (2026-07-19). Customer intake no longer depends on it
 * (POST /api/inquiries, app/api/inquiries/route.ts, is ungated via an exact-route RBAC exemption
 * instead). Only the two routes under app/api/external/** still call this — both are themselves
 * marked @deprecated. Remove this file together with them once no real external caller is
 * confirmed to exist.
 *
 * cnbiz.ai.kr 챗봇처럼 브라우저 세션이 없는 서버-투-서버 호출을 인증하는 유일한 수단.
 * lib/auth/rbac.ts의 UNGATED_API_PREFIXES는 세션(role) 게이팅만 없앨 뿐이라 — 여기서
 * 통과시키지 않으면 해당 경로는 완전히 무방비 공개 API가 된다. 반드시 라우트 핸들러
 * 최상단에서 호출해야 한다.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyExternalApiKey(request: Request): boolean {
  const expected = process.env.CHATBOT_API_KEY;

  if (!expected) {
    // getDefaultStore()(lib/db/index.ts)와 동일한 fail-fast 원칙: 프로덕션에 키가
    // 없으면 전부 차단, 로컬 개발(next dev)에서만 미설정을 허용한다.
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[apiKey] CHATBOT_API_KEY가 설정되지 않았습니다 — 로컬 환경이라 허용합니다.");
    return true;
  }

  const provided = request.headers.get(HEADER_NAME);
  if (!provided) return false;

  return safeCompare(provided, expected);
}
