import { createHmac, timingSafeEqual } from "node:crypto";

/** 회원가입 없이 비밀번호 하나만 공유하는 최소 보호 — 의뢰자 1명(또는 소수)만 접근하는
 * 내부용 업로드 사이트라 이 정도 수준으로 충분하다고 판단(공개 서비스가 아님). */
export const AUTH_COOKIE = "lev_auth";

function expectedToken(): string {
  const secret = process.env.ACCESS_PASSWORD || "";
  return createHmac("sha256", secret).update("lecture-editor-web-session").digest("hex");
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ACCESS_PASSWORD || "";
  return expected.length > 0 && password === expected;
}

export function sessionToken(): string {
  return expectedToken();
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = expectedToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
