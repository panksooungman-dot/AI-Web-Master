import { createHmac, randomBytes } from "node:crypto";
import { SITE_URL } from "@/lib/site-config";

/**
 * 근로자가 계약서에 서명·제출하면 사업주에게 알린다(Slack, SOLAPI 문자).
 * - 환경변수가 있는 채널만 보낸다. 하나도 없으면 아무것도 하지 않는다.
 * - 알림은 서명 제출과 별개다. 어떤 이유로든 실패해도 예외를 던지지 않고 결과만 돌려준다(제출은 이미 끝난 뒤다).
 * - 근로자가 입력한 이름만 넣고 전화번호·주소는 넣지 않는다(문자는 통신사를 거치고 휴대폰에 남는다).
 */

export type Env = Record<string, string | undefined>;
export type NotifyResult = { channel: "slack" | "solapi"; ok: boolean; error?: string };

const TIMEOUT_MS = 4000;

/** 근로자가 입력한 이름에서 Slack 멘션·링크·서식 문자를 없애고 길이를 줄인다. */
export function safeName(name: string): string {
  const cleaned = name.replace(/[<>&*_~`|@#\\[\]]/g, "").replace(/\s+/g, " ").trim();
  return (cleaned || "근로자").slice(0, 20);
}

export function buildMessage(name: string, link = `${SITE_URL}/admin/submissions`): string {
  return `[사색찬미] ${safeName(name)}님이 근로계약서에 서명했습니다. 사업주 서명 후 확정해 주세요.\n${link}`;
}

async function sendSlack(url: string, text: string, fetchFn: typeof fetch): Promise<NotifyResult> {
  try {
    const res = await fetchFn(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? { channel: "slack", ok: true } : { channel: "slack", ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { channel: "slack", ok: false, error: e instanceof Error ? e.name : "error" };
  }
}

/** SOLAPI 인증 헤더: HMAC-SHA256(secret, 날짜+salt). */
export function solapiAuthHeader(apiKey: string, apiSecret: string, now = new Date(), salt = randomBytes(16).toString("hex")): string {
  const date = now.toISOString();
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function sendSolapi(env: Env, text: string, fetchFn: typeof fetch): Promise<NotifyResult> {
  try {
    const res = await fetchFn("https://api.solapi.com/messages/v4/send-many/detail", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: solapiAuthHeader(env.SOLAPI_API_KEY!, env.SOLAPI_API_SECRET!) },
      body: JSON.stringify({ messages: [{ to: env.SOLAPI_TO!.replace(/\D/g, ""), from: env.SOLAPI_FROM!.replace(/\D/g, ""), text }] }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { channel: "solapi", ok: false, error: `HTTP ${res.status}` };
    // 접수 자체가 전부 실패로 집계된 경우도 실패로 본다(예: 발신번호 미등록).
    const data = (await res.json().catch(() => null)) as { groupInfo?: { count?: { total?: number; registeredFailed?: number } } } | null;
    const c = data?.groupInfo?.count;
    if (c && typeof c.total === "number" && c.total > 0 && c.registeredFailed === c.total) return { channel: "solapi", ok: false, error: "접수 실패" };
    return { channel: "solapi", ok: true };
  } catch (e) {
    return { channel: "solapi", ok: false, error: e instanceof Error ? e.name : "error" };
  }
}

/** 켜져 있는 채널로 보내고 채널별 결과를 돌려준다. 채널이 없으면 빈 배열. */
export async function notifySubmission(name: string, env: Env = process.env, fetchFn: typeof fetch = fetch): Promise<NotifyResult[]> {
  const text = buildMessage(name);
  const jobs: Promise<NotifyResult>[] = [];
  const slack = env.SLACK_WEBHOOK_URL?.trim();
  if (slack && slack.startsWith("https://hooks.slack.com/")) jobs.push(sendSlack(slack, text, fetchFn));
  if (env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_FROM && env.SOLAPI_TO) jobs.push(sendSolapi(env, text, fetchFn));
  return Promise.all(jobs);
}
