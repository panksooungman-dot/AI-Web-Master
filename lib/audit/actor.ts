import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * API route에서 감사 로그의 actor(이메일)를 구하는 공용 헬퍼 — app/api/auth/me/route.ts와
 * 동일한 방식(next/headers의 cookies() + getCurrentUser())으로 세션을 읽는다. lib/audit/log.ts
 * 자체는 Next.js에 의존하지 않도록 이 파일에 분리했다(순수 fs 모듈로 유지, 테스트 용이성).
 */
export async function getCurrentActorEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = getCurrentUser(sessionId);
  return user?.email ?? null;
}
