import { getEmailProvider } from "@/lib/contact/email";
import type { InquiryRecord } from "./types";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";

/**
 * 아키텍처 SSOT(CNBIZ.KR → CNBIZ.AI.KR → AI Business OS)상 "관리자 알림"은 CNBIZ.AI.KR의
 * 책임이다. CNBIZ.AI.KR이 아직 이 알림을 자체적으로 보내지 않아(2026-07-21 확인), AI Business OS가
 * app/api/external/inquiries/route.ts에서 이 함수를 호출해 임시로 대행하고 있다 — CNBIZ.AI.KR이
 * 구축되면 이 함수(및 이 호출)는 이관 대상이다(PROJECT_STATUS.md 참고). 그 전까지는 기존 동작을
 * 그대로 유지한다.
 *
 * lib/contact/email의 provider 추상화(EmailProvider, CONTACT_EMAIL_PROVIDER/TO/FROM)를 그대로
 * 재사용한다 — 이름은 "contact"지만 인터페이스 자체는 범용이라, 새 provider 계층을 만들지
 * 않고 관리자 알림 수신함(CONTACT_EMAIL_TO)을 그대로 공유한다.
 */
export async function notifyAdminOfNewInquiry(
  inquiry: InquiryRecord,
  client: ClientRecord,
  order: WebsiteOrderRecord
): Promise<void> {
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM;

  if (!to || !from) {
    console.warn(
      "[inquiry-email] CONTACT_EMAIL_TO/CONTACT_EMAIL_FROM not set, skipping admin notification",
    );
    return;
  }

  const provider = getEmailProvider();

  try {
    await provider.send({
      to,
      from,
      subject: `[CNBIZ 챗봇] 새 제작 의뢰 — ${client.companyName || client.contactName}`,
      text: [
        `고객사: ${client.companyName || "(미기재)"}`,
        `담당자: ${client.contactName}`,
        `이메일: ${client.email}`,
        `연락처: ${client.phone || "(미기재)"}`,
        `홈페이지 종류: ${order.siteType || "(미기재)"}`,
        `요구사항: ${order.requirements}`,
        `예산: ${order.budget || "(협의)"}`,
        `Inquiry ID: ${inquiry.id}`,
        `Website Order ID: ${order.id}`,
      ].join("\n"),
    });
    console.log(`[inquiry-email] admin notification sent for inquiry ${inquiry.id} to ${to}`);
  } catch (error) {
    console.error(`[inquiry-email] failed to send admin notification for inquiry ${inquiry.id}`, error);
  }
}
