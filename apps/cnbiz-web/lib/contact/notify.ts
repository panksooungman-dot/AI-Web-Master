import type { ContactSubmissionRecord } from "./types";
import { getEmailProvider } from "./email";

/**
 * The submission is already saved locally by lib/contact/store.ts before this
 * runs, so a failed or unconfigured email send never loses the submission —
 * it only means the notification email didn't go out.
 */
export async function notifyContactSubmission(submission: ContactSubmissionRecord): Promise<void> {
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM;

  if (!to || !from) {
    console.warn(
      "[contact-email] CONTACT_EMAIL_TO/CONTACT_EMAIL_FROM not set, skipping email notification",
    );
    return;
  }

  const provider = getEmailProvider();

  try {
    await provider.send({
      to,
      from,
      subject: `[CNBIZ 문의] ${submission.name}님의 새 문의`,
      text: [
        `이름: ${submission.name}`,
        `연락처: ${submission.phone}`,
        `이메일: ${submission.email}`,
        `문의 내용: ${submission.message}`,
        `접수 시각: ${submission.submittedAt}`,
      ].join("\n"),
    });
  } catch (error) {
    console.error("[contact-email] failed to send notification email", error);
  }
}
