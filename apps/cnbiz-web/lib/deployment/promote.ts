import type { CollectionStore } from "@/lib/db/collectionStore";
import { recordAuditEvent } from "@/lib/audit/log";
import { promoteDeployment } from "@/lib/vercel/client";
import { getWebsite, updateWebsiteDeployment } from "@/lib/websites/registry";
import { notifyCustomerForWebsiteIfReady } from "@/lib/websites/notify";

/**
 * "미리보기 확인 후 운영 배포" 요구사항(2026-09-11) — lib/deployment/pipeline.ts가 자동으로
 * 만드는 것은 항상 Preview 배포까지다. 관리자가 실제 화면(website.deployment.url, Preview URL)을
 * 확인한 뒤 이 함수를 호출해야만 그 배포가 실제 운영 도메인으로 승격되고, 그때 비로소 고객 알림
 * (lib/websites/notify.ts)도 함께 발송된다.
 */
export interface PromoteResult {
  success: boolean;
  error?: string;
}

export interface PromoteDeps {
  promoteDeployment: typeof promoteDeployment;
}

const DEFAULT_DEPS: PromoteDeps = { promoteDeployment };

export async function promoteWebsiteToProduction(
  websiteId: string,
  actor: string | null = null,
  deps: PromoteDeps = DEFAULT_DEPS,
  store?: CollectionStore
): Promise<PromoteResult> {
  const website = await getWebsite(websiteId, store);
  if (!website) {
    return { success: false, error: "Website를 찾을 수 없습니다." };
  }

  if (website.deploymentStatus !== "PreviewReady" || !website.deployment) {
    return {
      success: false,
      error: `현재 상태("${website.deploymentStatus ?? "미배포"}")에서는 운영 배포를 확정할 수 없습니다. Preview 배포가 완료된 상태여야 합니다.`,
    };
  }

  const result = await deps.promoteDeployment(website.deployment.vercelProjectId, website.deployment.deploymentId);

  if (!result.success) {
    await recordAuditEvent(
      {
        action: "deployment.vercel.promote",
        actor,
        success: false,
        detail: result.error ?? "알 수 없는 오류",
        metadata: { websiteId },
      },
      store
    );
    return { success: false, error: result.error ?? "운영 배포 확정에 실패했습니다." };
  }

  await updateWebsiteDeployment(websiteId, { deploymentStatus: "Success" }, store);
  await recordAuditEvent(
    {
      action: "deployment.vercel.promote",
      actor,
      success: true,
      detail: `https://${website.deployment.vercelProjectName}.vercel.app`,
      metadata: { websiteId },
    },
    store
  );

  await notifyCustomerForWebsiteIfReady(websiteId, undefined, store);

  return { success: true };
}
