/**
 * Slack Incoming Webhook 전송 — lib/contact/email/providers/resend.ts와 동일한 fetch 패턴.
 * 관리자 알림 이메일(lib/inquiries/notify.ts)과 병행하는 두 번째 알림 채널로,
 * SLACK_WEBHOOK_URL(Slack 워크스페이스에서 발급하는 Incoming Webhook URL) 하나만 있으면
 * 동작한다 — Resend와 달리 발신 도메인 인증이 필요 없어 설정이 더 간단하다.
 */

export interface SlackNotifier {
  send(text: string): Promise<void>;
}

export function createSlackWebhookNotifier(webhookUrl: string): SlackNotifier {
  return {
    async send(text: string) {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Slack webhook error (${res.status}): ${body}`);
      }
    },
  };
}
