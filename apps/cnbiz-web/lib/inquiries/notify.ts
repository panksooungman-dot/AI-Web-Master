import { getEmailProvider } from "@/lib/contact/email";
import type { EmailProvider } from "@/lib/contact/email/types";
import { createSlackWebhookNotifier, type SlackNotifier } from "./slack";
import { createSolapiNotifier, type SolapiNotifier } from "./solapi";
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

/**
 * 관리자 알림 이메일(notifyAdminOfNewInquiry)과 병행하는 Slack 알림 — 사용자가 이메일 미수신
 * 문제를 겪던 중 "Slack으로 하면 어때?"라고 제안, 이메일을 대체하지 않고 병행하기로 확정.
 * SLACK_WEBHOOK_URL 하나만 설정하면 되어 Resend(발신 도메인 인증 필요)보다 설정이 간단하다.
 * notifyAdminOfNewInquiry와 동일한 3갈래(env 미설정으로 건너뜀/발송 성공/발송 실패) 패턴으로
 * Audit Log(`inquiry.notify_admin_slack`)에 기록한다. 이메일 발송 성공/실패와 무관하게 독립
 * 실행되며(app/api/inquiries/route.ts에서 별도 호출), 어느 한쪽이 실패해도 다른 채널에는
 * 영향을 주지 않는다.
 */
export async function notifyAdminOfNewInquirySlack(
  inquiry: InquiryRecord,
  client: ClientRecord,
  order: WebsiteOrderRecord,
  notifier: SlackNotifier = createSlackWebhookNotifier(process.env.SLACK_WEBHOOK_URL ?? ""),
  store: CollectionStore = getDefaultStore()
): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[inquiry-slack] SLACK_WEBHOOK_URL not set, skipping admin Slack notification");
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin_slack",
        actor: null,
        success: false,
        detail: "관리자 알림 Slack 건너뜀 — 환경 변수 미설정: SLACK_WEBHOOK_URL",
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
    return;
  }

  try {
    await notifier.send(
      [
        `:bell: *새 제작 의뢰* — ${client.companyName || client.contactName}`,
        `담당자: ${client.contactName} (${client.email})`,
        `연락처: ${client.phone || "(미기재)"}`,
        `홈페이지 종류: ${order.siteType || "(미기재)"}`,
        `요구사항: ${order.requirements}`,
        `예산: ${order.budget || "(협의)"}`,
        `Inquiry ID: ${inquiry.id}`,
      ].join("\n")
    );
    console.log(`[inquiry-slack] admin notification sent for inquiry ${inquiry.id}`);
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin_slack",
        actor: null,
        success: true,
        detail: `관리자 알림 Slack 발송: "${client.companyName || client.contactName}"`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[inquiry-slack] failed to send admin notification for inquiry ${inquiry.id}`, error);
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin_slack",
        actor: null,
        success: false,
        detail: `관리자 알림 Slack 발송 실패: ${message}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
  }
}

/**
 * 관리자 알림 이메일/Slack과 병행하는 세 번째 채널 — SOLAPI(문자 SMS) 발송. 사용자가 이미
 * SOLAPI를 사용 중이라고 확인해 추가. 나머지 두 채널과 동일한 3갈래(env 미설정으로 건너뜀/발송
 * 성공/발송 실패) 패턴으로 Audit Log(`inquiry.notify_admin_solapi`)에 기록하며, 다른 채널의
 * 성공/실패와 무관하게 독립 실행된다(app/api/inquiries/route.ts에서 별도 호출).
 *
 * SOLAPI_FROM은 SOLAPI 콘솔에 발신번호로 사전 등록·인증된 번호여야 한다(일반적인 SMS 게이트웨이
 * 공통 요건 — 이 코드가 검증할 수 있는 부분이 아니므로 발송 실패 시 그 응답 메시지가 그대로
 * Audit Log에 남는다).
 */
export async function notifyAdminOfNewInquirySolapi(
  inquiry: InquiryRecord,
  client: ClientRecord,
  order: WebsiteOrderRecord,
  notifier: SolapiNotifier = createSolapiNotifier(
    process.env.SOLAPI_API_KEY ?? "",
    process.env.SOLAPI_API_SECRET ?? "",
    process.env.SOLAPI_TO ?? "",
    process.env.SOLAPI_FROM ?? ""
  ),
  store: CollectionStore = getDefaultStore()
): Promise<void> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const to = process.env.SOLAPI_TO;
  const from = process.env.SOLAPI_FROM;

  if (!apiKey || !apiSecret || !to || !from) {
    const missing = [
      !apiKey && "SOLAPI_API_KEY",
      !apiSecret && "SOLAPI_API_SECRET",
      !to && "SOLAPI_TO",
      !from && "SOLAPI_FROM",
    ]
      .filter(Boolean)
      .join(", ");
    console.warn("[inquiry-solapi] SOLAPI env vars not set, skipping admin SOLAPI notification");
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin_solapi",
        actor: null,
        success: false,
        detail: `관리자 알림 SOLAPI 건너뜀 — 환경 변수 미설정: ${missing}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
    return;
  }

  try {
    await notifier.send(
      [
        `[CNBIZ] 새 제작 의뢰 — ${client.companyName || client.contactName}`,
        `담당자: ${client.contactName} (${client.phone || client.email})`,
        `홈페이지 종류: ${order.siteType || "(미기재)"}`,
        `Inquiry ID: ${inquiry.id}`,
      ].join("\n")
    );
    console.log(`[inquiry-solapi] admin notification sent for inquiry ${inquiry.id}`);
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin_solapi",
        actor: null,
        success: true,
        detail: `관리자 알림 SOLAPI 발송: "${client.companyName || client.contactName}" → ${to}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[inquiry-solapi] failed to send admin notification for inquiry ${inquiry.id}`, error);
    await recordAuditEvent(
      {
        action: "inquiry.notify_admin_solapi",
        actor: null,
        success: false,
        detail: `관리자 알림 SOLAPI 발송 실패: ${message}`,
        metadata: { inquiryId: inquiry.id, websiteOrderId: order.id },
      },
      store
    );
  }
}
