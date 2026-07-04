import type { ContactEmailPayload, EmailProvider } from "../types";

/** Used when no email provider is configured — the submission is still saved locally by lib/contact/store.ts. */
export function createNoopProvider(): EmailProvider {
  return {
    async send(payload: ContactEmailPayload) {
      console.warn("[contact-email] no provider configured, email not sent", {
        to: payload.to,
        subject: payload.subject,
      });
    },
  };
}
