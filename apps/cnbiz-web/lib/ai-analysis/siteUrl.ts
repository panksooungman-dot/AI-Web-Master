import { SITE_URL } from "@/lib/site-config";

/**
 * lib/uploads/storage.ts의 로컬 fs 폴백은 상대 경로(`/api/uploads/<file>`)를 반환한다 —
 * 서버 프로세스 안에서 자기 자신에게 fetch()로 되돌아가려면 절대 URL이 필요하다. 프로덕션
 * (Vercel)은 SUPABASE_URL이 항상 설정돼 있어야 하므로(lib/db/index.ts) 이 폴백 경로 자체가
 * 실사용되지 않는다 — 이 함수는 사실상 로컬 개발 전용 분기다.
 */
export function resolveAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = process.env.NODE_ENV === "production" ? SITE_URL : "http://localhost:3000";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}
