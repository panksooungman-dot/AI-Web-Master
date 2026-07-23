import { getEmailProvider } from "@/lib/contact/email";
import type { InquiryRecord } from "./types";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";

/**
 * AI Business OS Rewiring(REWIRING_REPORT.md) — 이전에는 "CNBIZ.AI.KR이 아직 구축되지 않아
 * app/api/external/inquiries/route.ts(현재 @deprecated)가 임시로 대행 중"이라는 전제였으나,
 * 그 외부 연동 자체가 실사용된 적이 없음이 확인되어 이 함수는 이제 내부 진입점
 * app/api/inquiries/route.ts(POST)의 정식 호출부다. cnbiz.kr 자체 문의 폼과
 * /developer/inquiries/new 관리자 수동 등록이 전부 이 경로를 거친다. 동작 자체는 변경 없음.
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
