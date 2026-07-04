import type { ContactEmailPayload, EmailProvider } from "../types";

const RESEND_API_URL = "https://api.resend.com/emails";

export function createResendProvider(apiKey: string): EmailProvider {
  return {
    async send(payload: ContactEmailPayload) {
      const res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          text: payload.text,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Resend API error (${res.status}): ${body}`);
      }
    },
  };
}
