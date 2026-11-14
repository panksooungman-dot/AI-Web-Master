import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * 관리자 인증 (서버 전용). 관리자는 1명이므로 환경변수의 비밀번호 1개로 로그인하고,
 * 서버가 서명한 쿠키로 세션을 유지한다. 세션은 서버에 저장하지 않는다(HMAC 서명 + 만료 시각).
 *
 * 환경변수
 * - CONTRACT_ADMIN_PASSWORD : 관리자 비밀번호 (10자 이상)
 * - CONTRACT_SESSION_SECRET : 쿠키 서명 비밀키 (32자 이상, 무작위 문자열)
 */

export const SESSION_COOKIE = "contract_admin";
export const SESSION_TTL_SEC = 8 * 60 * 60;
const MIN_PASSWORD = 10;
const MIN_SECRET = 32;
/** 개발 서버에서만 쓰는 임시 서명키. 운영(NODE_ENV=production)에서는 절대 사용하지 않는다. */
const DEV_SECRET = "dev-only-session-secret-do-not-use-in-production-0000";

export interface AuthConfig {
  configured: boolean;
  /** configured가 false일 때 관리자에게 보여 줄 원인 */
  problem?: string;
  password?: string;
  secret?: string;
}

type Env = Record<string, string | undefined>;

export function getAuthConfig(env: Env = process.env): AuthConfig {
  const password = env.CONTRACT_ADMIN_PASSWORD;
  if (!password) return { configured: false, problem: "CONTRACT_ADMIN_PASSWORD 환경변수가 설정되지 않았습니다." };
  if (password.length < MIN_PASSWORD) return { configured: false, problem: `관리자 비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.` };
  let secret = env.CONTRACT_SESSION_SECRET;
  if (!secret) {
    if (env.NODE_ENV === "production") return { configured: false, problem: "CONTRACT_SESSION_SECRET 환경변수가 설정되지 않았습니다." };
    secret = DEV_SECRET;
  }
  if (secret.length < MIN_SECRET && secret !== DEV_SECRET) return { configured: false, problem: `세션 비밀키는 ${MIN_SECRET}자 이상이어야 합니다.` };
  return { configured: true, password, secret };
}

const sha = (s: string) => createHash("sha256").update(s).digest();

/** 비밀번호 비교: 같은 길이의 해시끼리 상수 시간으로 비교한다. */
export function passwordMatches(input: string, expected: string): boolean {
  return timingSafeEqual(sha(input), sha(expected));
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const mac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("base64url");

/** 서명된 세션 토큰 생성. `payload.exp`는 만료 시각(ms). */
export function createSessionToken(secret: string, now: number = Date.now()): string {
  const body = b64(JSON.stringify({ v: 1, exp: now + SESSION_TTL_SEC * 1000, n: randomBytes(8).toString("hex") }));
  return body + "." + mac(secret, body);
}

export function verifySessionToken(token: string | undefined | null, secret: string, now: number = Date.now()): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const body = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = mac(secret, body);
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) return false;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    return p && p.v === 1 && typeof p.exp === "number" && p.exp > now;
  } catch {
    return false;
  }
}

/** Cookie 헤더에서 값 하나를 꺼낸다. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

/** 요청의 쿠키가 유효한 관리자 세션인지 서버에서 확인한다. */
export function isAdminRequest(cookieHeader: string | null | undefined, config: AuthConfig = getAuthConfig(), now: number = Date.now()): boolean {
  if (!config.configured || !config.secret) return false;
  return verifySessionToken(readCookie(cookieHeader, SESSION_COOKIE), config.secret, now);
}
