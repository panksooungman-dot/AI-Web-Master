const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

/**
 * In-memory, single-instance rate limiter — same pattern as lib/contact/spam.ts, kept as a
 * separate instance (this feature has its own submission volume/abuse profile).
 */
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

/**
 * Honeypot field: real users never fill it in; bots filling every field do. Named "website"
 * (not "company") because this form has a real "companyName" field, unlike the generic
 * contact form's honeypot (see lib/contact/spam.ts).
 */
export function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== "object" || body === null) return false;
  const value = (body as Record<string, unknown>).website;
  return typeof value === "string" && value.trim().length > 0;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
