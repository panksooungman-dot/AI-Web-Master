import { getEmailProvider } from "@/lib/contact/email";
import type { EmailProvider } from "@/lib/contact/email/types";
import type { InquiryRecord } from "./types";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";
import { recordAuditEvent } from "@/lib/audit/log";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

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
 *
 * 사용자가 실 배포 환경에서 "관리자 알림 이메일이 안 온다"고 반복 보고했으나, 이 함수가 조용히
 * console.warn/console.error만 남기고 끝나는 구조라 서버 로그 접근 권한이 없는 관리자는 원인을
 * 전혀 확인할 수 없었다(스킵인지, 실제 발송 실패인지조차 구분 불가) — 세 갈래(env 미설정으로
 * 스킵/발송 성공/발송 실패) 전부 Audit Log(`inquiry.notify_admin`)에 기록해 `/developer/errors`
 * 화면에서 실패 사유를 직접 확인할 수 있도록 함.
 */
export async function notifyAdminOfNewInquiry(
  inquiry: InquiryRecord,
  client: ClientRecord,
  order: WebsiteOrderRecord,
  provider: EmailProvider = getEmailProvider(),
  store: CollectionStore = getDefaultStore()
): Promise<void> {
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM;

  if (!to || !from) {
    const missing = [!to && "CONTACT_EMAIL_TO", !from && "CONTACT_EMAIL_FROM"].filter(Boolean).join(", ");
    console.warn(
      "[inquiry-email] CONTACT_EMAIL_TO/CONTACT_EMAIL_FROM not set, skipping admin notification",
    );
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin",
        actor: null,
        success: false,
        detail: `관리자 알림 이메일 건너뜀 — 환경 변수 미설정: ${missing}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
    return;
  }

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
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin",
        actor: null,
        success: true,
        detail: `관리자 알림 이메일 발송: "${client.companyName || client.contactName}" → ${to}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[inquiry-email] failed to send admin notification for inquiry ${inquiry.id}`, error);
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin",
        actor: null,
        success: false,
        detail: `관리자 알림 이메일 발송 실패: ${message}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
  }
}
