const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
/**
 * lib/requests/spam.ts(5/10분)보다 한도를 높게 둔다 — 이 경로의 호출자는 익명 방문자가
 * 아니라 API 키로 인증된 챗봇 백엔드 하나이므로, 정상적인 대화량이 더 몰릴 수 있다.
 * 여기서는 "키가 유출됐을 때의 남용 방지"가 목적이지 봇 차단이 목적이 아니다.
 */
const RATE_LIMIT_MAX_REQUESTS = 30;

const requestTimestamps = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestTimestamps.get(key) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  requestTimestamps.set(key, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
