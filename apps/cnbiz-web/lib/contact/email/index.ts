import type { EmailProvider } from "./types";
import { createResendProvider } from "./providers/resend";
import { createNoopProvider } from "./providers/noop";

/**
 * Provider is chosen via CONTACT_EMAIL_PROVIDER so it can be swapped later
 * (add a new file under providers/ and a case here) without touching callers.
 */
export function getEmailProvider(): EmailProvider {
  const provider = process.env.CONTACT_EMAIL_PROVIDER;

  switch (provider) {
    case "resend": {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        console.warn(
          "[contact-email] CONTACT_EMAIL_PROVIDER=resend but RESEND_API_KEY is not set",
        );
        return createNoopProvider();
      }
      return createResendProvider(apiKey);
    }
    default:
      return createNoopProvider();
  }
}
