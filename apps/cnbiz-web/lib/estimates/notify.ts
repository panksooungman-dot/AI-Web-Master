import { getEmailProvider } from "@/lib/contact/email";
import type { EmailProvider } from "@/lib/contact/email/types";
import { createSlackWebhookNotifier, type SlackNotifier } from "@/lib/inquiries/slack";
import { createSolapiNotifier, type SolapiNotifier } from "@/lib/inquiries/solapi";
import type { EstimateRecord } from "./types";
import { recordAuditEvent, type AuditAction } from "@/lib/audit/log";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { SITE_URL } from "@/lib/site-config";

function buildAdminEstimateUrl(estimateId: string): string {
  return `${SITE_URL}/developer/estimates/${estimateId}`;
}

interface ChannelOutcome {
  channel: "이메일" | "Slack" | "SOLAPI";
  ok: boolean;
  reason?: string;
}

async function trySendEmail(subject: string, text: string, provider: EmailProvider): Promise<ChannelOutcome> {
  const to = process.env.CONTACT_EMAIL_TO;
  const from = process.env.CONTACT_EMAIL_FROM;
  if (!to || !from) return { channel: "이메일", ok: false, reason: "환경 변수 미설정" };

  try {
    await provider.send({ to, from, subject, text });
    return { channel: "이메일", ok: true };
  } catch (error) {
    return { channel: "이메일", ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function trySendSlack(text: string, notifier: SlackNotifier): Promise<ChannelOutcome> {
  if (!process.env.SLACK_WEBHOOK_URL) return { channel: "Slack", ok: false, reason: "환경 변수 미설정" };

  try {
    await notifier.send(text);
    return { channel: "Slack", ok: true };
  } catch (error) {
    return { channel: "Slack", ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function trySendSolapi(text: string, notifier: SolapiNotifier): Promise<ChannelOutcome> {
  const { SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_TO, SOLAPI_FROM } = process.env;
  if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_TO || !SOLAPI_FROM) {
    return { channel: "SOLAPI", ok: false, reason: "환경 변수 미설정" };
  }

  try {
    await notifier.send(text);
    return { channel: "SOLAPI", ok: true };
  } catch (error) {
    return { channel: "SOLAPI", ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function summarizeOutcomes(outcomes: ChannelOutcome[]): string {
  return outcomes.map((outcome) => `${outcome.channel}: ${outcome.ok ? "성공" : `건너뜀/실패(${outcome.reason})`}`).join(" · ");
}

/**
 * 의뢰자가 견적서를 수락/거절하거나 메시지를 남겼을 때 관리자에게 알린다.
 * lib/inquiries/notify.ts의 이메일·Slack·SOLAPI 3채널을 그대로 재사용하되, 견적서 활동은
 * 의뢰 접수만큼 핵심적인 이벤트는 아니라 채널마다 별도 AuditAction을 두지 않고 하나의
 * 이벤트(estimate.client_decision / estimate.client_message)에 3채널 결과를 함께 기록한다.
 * 비즈니스 사실(의뢰자가 실제로 결정을 내렸다/메시지를 남겼다) 자체는 알림 성공 여부와
 * 무관하게 항상 success:true로 기록한다 — 알림 채널이 전부 미설정이어도 "결정이 없었던 일"이
 * 되어서는 안 되기 때문이다.
 */
export async function notifyAdminOfEstimateActivity(
  action: AuditAction & ("estimate.client_decision" | "estimate.client_message"),
  estimate: EstimateRecord,
  companyName: string,
  subject: string,
  bodyLines: string[],
  store: CollectionStore = getDefaultStore()
): Promise<void> {
  const text = [...bodyLines, buildAdminEstimateUrl(estimate.id)].join("\n");

  const outcomes = await Promise.all([
    trySendEmail(subject, text, getEmailProvider()),
    trySendSlack(text, createSlackWebhookNotifier(process.env.SLACK_WEBHOOK_URL ?? "")),
    trySendSolapi(
      text,
      createSolapiNotifier(
        process.env.SOLAPI_API_KEY ?? "",
        process.env.SOLAPI_API_SECRET ?? "",
        process.env.SOLAPI_TO ?? "",
        process.env.SOLAPI_FROM ?? ""
      )
    ),
  ]);

  await recordAuditEvent(
    {
      action,
      actor: null,
      success: true,
      detail: `${subject} — ${summarizeOutcomes(outcomes)}`,
      metadata: { estimateId: estimate.id, websiteOrderId: estimate.websiteOrderId, companyName },
    },
    store
  );
}
