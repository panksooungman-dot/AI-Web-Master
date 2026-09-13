import { getEmailProvider } from "@/lib/contact/email";
import type { EmailProvider } from "@/lib/contact/email/types";
import { createSlackWebhookNotifier, type SlackNotifier } from "@/lib/inquiries/slack";
import { createSolapiNotifier, type SolapiNotifier } from "@/lib/inquiries/solapi";
import type { ContractRecord } from "./types";
import { recordAuditEvent } from "@/lib/audit/log";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { SITE_URL } from "@/lib/site-config";

function buildAdminContractUrl(contractId: string): string {
  return `${SITE_URL}/developer/contracts/${contractId}`;
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
 * 의뢰자가 계약서에 서명했을 때 관리자에게 알린다. lib/estimates/notify.ts의
 * notifyAdminOfEstimateActivity()와 완전히 동일한 원칙(3채널 재사용, 알림 성공 여부와 무관하게
 * 서명 사실 자체는 항상 success:true로 기록) — 새 채널 로직을 추가하지 않고 그대로 복제한다.
 */
export async function notifyAdminOfContractSignature(
  contract: ContractRecord,
  companyName: string,
  signerName: string,
  store: CollectionStore = getDefaultStore()
): Promise<void> {
  const subject = `[CNBIZ] 계약서 서명 완료 — ${companyName}`;
  const text = [
    `고객사: ${companyName}`,
    `서명자: ${signerName}`,
    "계약서에 서명했습니다.",
    buildAdminContractUrl(contract.id),
  ].join("\n");

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
      action: "contract.client_signature",
      actor: null,
      success: true,
      detail: `${subject} — ${summarizeOutcomes(outcomes)}`,
      metadata: { contractId: contract.id, websiteOrderId: contract.websiteOrderId, companyName, signerName },
    },
    store
  );
}
