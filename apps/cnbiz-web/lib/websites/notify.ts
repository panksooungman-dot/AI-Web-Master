import { getEmailProvider } from "@/lib/contact/email";
import type { EmailProvider } from "@/lib/contact/email/types";
import { recordAuditEvent } from "@/lib/audit/log";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getAiJob } from "@/lib/aiJobs/registry";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { getClient } from "@/lib/clients/registry";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";
import { getWebsite } from "./registry";
import type { WebsiteRecord } from "./registry";

/**
 * Production Deploy 성공 후 고객에게 완성된 사이트 주소를 이메일로 전달한다.
 * lib/inquiries/notify.ts(notifyAdminOfNewInquiry)와 완전히 동일한 원칙 —
 * lib/contact/email의 provider 추상화(EmailProvider)를 그대로 재사용하고, 새 이메일 발송
 * 시스템은 만들지 않는다. Provider 미설정 시 noop로 조용히 스킵한다(getEmailProvider() 자체가
 * 이미 그 폴백을 담당).
 *
 * website.deployment.url이 아니라 website.deployment.vercelProjectName으로 프로덕션 별칭
 * (https://{name}.vercel.app)을 직접 계산해서 사용한다 — website.deployment.url은 Vercel의
 * 배포별(per-deployment) URL이라 익명 접속 시 SSO로 리다이렉트되므로 고객에게 보내기에 적합하지
 * 않다(FINAL_E2E_REPORT_v5.md에서 실측 확인된 사실). Vercel Client를 호출하지 않는 순수 문자열
 * 조합이다.
 */
export async function notifyCustomerOfDeployment(
  client: ClientRecord,
  websiteOrder: WebsiteOrderRecord,
  website: WebsiteRecord,
  provider: EmailProvider = getEmailProvider(),
  store?: CollectionStore
): Promise<void> {
  if (!website.deployment) return;

  const from = process.env.CONTACT_EMAIL_FROM;
  if (!from) {
    console.warn("[deployment-email] CONTACT_EMAIL_FROM not set, skipping customer notification");
    return;
  }

  const productionUrl = `https://${website.deployment.vercelProjectName}.vercel.app`;

  try {
    await provider.send({
      to: client.email,
      from,
      subject: `[CNBIZ] ${websiteOrder.name} 홈페이지가 완성되었습니다`,
      text: [
        `${client.contactName}님, 안녕하세요.`,
        "",
        "요청하신 홈페이지 제작이 완료되어 아래 주소에서 바로 확인하실 수 있습니다.",
        productionUrl,
        "",
        "문의사항이 있으시면 언제든지 회신해 주세요.",
      ].join("\n"),
    });

    console.log(`[deployment-email] customer notification sent for website ${website.id} to ${client.email}`);

    await recordAuditEvent(
      {
        action: "deployment.notify_customer",
        actor: null,
        success: true,
        detail: `${client.email} → ${productionUrl}`,
        metadata: { websiteOrderId: websiteOrder.id, websiteId: website.id },
      },
      store
    );
  } catch (error) {
    console.error(`[deployment-email] failed to send customer notification for website ${website.id}`, error);

    await recordAuditEvent(
      {
        action: "deployment.notify_customer",
        actor: null,
        success: false,
        detail: error instanceof Error ? error.message : "알 수 없는 오류",
        metadata: { websiteOrderId: websiteOrder.id, websiteId: website.id },
      },
      store
    );
  }
}

/**
 * AI Job id로부터 client/websiteOrder/website를 조회해 notifyCustomerOfDeployment()를
 * 호출하는 조합 함수. AI Business OS Lifecycle Extension Point(lib/aiJobs/hooks/
 * customerNotification.ts)가 이 함수를 Hook으로 등록해 호출한다 — 이 파일 자체는
 * "Hook"·"Lifecycle" 같은 개념을 전혀 알지 못하는 순수 도메인 모듈이다.
 *
 * triggerDeployment()·triggerWorkspaceProvisioning()과 동일한 원칙 — deploymentStatus가
 * "Success"가 아니거나(NotConfigured/Failed/미시도) client.email이 없으면 아무 것도 하지
 * 않는다. `notifyFn`은 동일한 DI 패턴 — 테스트에서 실제 이메일 발송 없이 검증 가능하다.
 */
export async function triggerCustomerNotification(
  jobId: string,
  notifyFn: typeof notifyCustomerOfDeployment = notifyCustomerOfDeployment,
  store?: CollectionStore
): Promise<void> {
  const job = await getAiJob(jobId, store);
  if (!job) return;

  const websiteOrder = await getWebsiteOrder(job.websiteOrderId, store);
  if (!websiteOrder || websiteOrder.websiteIds.length === 0) return;

  const websiteId = websiteOrder.websiteIds[websiteOrder.websiteIds.length - 1];
  const website = await getWebsite(websiteId, store);
  if (!website || website.deploymentStatus !== "Success" || !website.deployment) return;

  const client = await getClient(websiteOrder.clientId, store);
  if (!client || !client.email) return;

  await notifyFn(client, websiteOrder, website, undefined, store).catch((error) => {
    console.error(`Customer notification failed for AI Job ${jobId}`, error);
  });
}
