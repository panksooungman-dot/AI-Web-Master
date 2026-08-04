import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { getInquiry } from "@/lib/inquiries/registry";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { listAiJobsByWebsiteOrder } from "@/lib/aiJobs/registry";
import { listWebsites } from "@/lib/websites/registry";

/**
 * cnbiz.ai.kr 챗봇이 문의 접수 후 진행 상태를 폴링하기 위한 순수 조회 계층. 새 Registry나
 * 새 저장 필드를 추가하지 않고, 이미 존재하는 4개 Registry(inquiries/websiteOrders/aiJobs/
 * websites)의 조회 함수만 조합해 하나의 고객 친화적 상태 스냅샷을 만든다.
 *
 * AiJob 조회는 WebsiteOrderRecord.aiJobIds가 아니라 listAiJobsByWebsiteOrder()를 쓴다.
 * (Release Readiness Audit — Major #1, 수정 완료: app/api/inquiries/route.ts와
 * app/api/external/inquiries/route.ts는 이제 AiJob 생성 직후 addAiJobToWebsiteOrder()를
 * 호출해 aiJobIds도 함께 채운다. 다만 이 조회 계층은 계속 AiJobRecord 자신의 websiteOrderId
 * 역참조로 직접 찾는 listAiJobsByWebsiteOrder()를 쓴다 — 하나의 WebsiteOrder가 재시도 등으로
 * 여러 AiJob/Website를 가질 수 있어 "가장 최근" 항목을 골라야 하는데, aiJobIds는 삽입 순서
 * 배열일 뿐 그 자체로 최신 판단 근거가 되지 않기 때문. 두 경로 모두 정확하지만 이 계층은
 * 굳이 aiJobIds 수정에 맞춰 바꿀 이유가 없어 그대로 둔다.)
 */
export type ExternalInquiryStatus =
  | "Received"
  | "OrderCreated"
  | "JobCreated"
  | "Running"
  | "Completed"
  | "Failed";

interface StageInfo {
  done: boolean;
  at: string | null;
}

export interface ExternalStatusStages {
  /** 접수 — Inquiry 생성. */
  received: StageInfo;
  /** Project(WebsiteOrder) 생성. 이 저장소에서 "Project"는 내부 Development OS 워크스페이스를
   *  가리키는 별도 용어라 API 필드명은 orderCreated를 쓰고, 문서에서 "Project 생성"으로 안내한다. */
  orderCreated: StageInfo;
  /** AI Job 생성 (Queued). */
  jobCreated: StageInfo;
  /** Worker가 Job을 실행 중. */
  running: StageInfo;
  /** Website 산출물 생성 완료. */
  websiteGenerated: StageInfo;
  /** Deployment Pipeline(lib/deployment/pipeline.ts) 완료 여부 — WebsiteRecord.deploymentStatus
   *  기준(Release Readiness Audit — Major #2, 수정 완료). 타임스탬프는 WebsiteRecord에 별도로
   *  저장되지 않아(updateWebsiteDeployment()가 채우는 필드 없음) at은 항상 null로 유지한다 —
   *  없는 값을 다른 필드(website.createdAt 등)로 추정해서 채우지 않는다. */
  deployed: StageInfo;
  completed: StageInfo;
  failed: StageInfo;
}

export interface ExternalOrderSummary {
  id: string;
  name: string;
  siteType: string;
  status: string;
}

export interface ExternalWebsiteSummary {
  id: string;
  name: string;
  siteType: string;
  /** Deployment Pipeline은 Vercel에 항상 production 배포 1회만 수행하고(isInitialDeployment:
   *  true — lib/deployment/pipeline.ts) 별도 preview 배포 단계가 없어, 구분할 실제 preview URL
   *  자체가 존재하지 않는다. deployUrl과 같은 값을 채워 넣지 않고(실제로 구분되지 않는 것을
   *  구분되는 것처럼 보이게 하지 않기 위해) 항상 null로 유지한다. 필드는 계약 안정성을 위해
   *  유지한다. */
  previewUrl: string | null;
  /** WebsiteRecord.deployment.url(lib/websites/registry.ts) 기준 — Deployment Pipeline이 실제로
   *  생성한 프로덕션 배포 URL(Release Readiness Audit — Major #2, 수정 완료). 배포 전이거나
   *  실패했으면 null. */
  deployUrl: string | null;
}

export interface ExternalInquiryStatusResult {
  inquiryId: string;
  status: ExternalInquiryStatus;
  stages: ExternalStatusStages;
  error: string | null;
  order: ExternalOrderSummary | null;
  website: ExternalWebsiteSummary | null;
  completedAt: string | null;
}

export async function getExternalInquiryStatus(
  inquiryId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ExternalInquiryStatusResult | null> {
  const inquiry = await getInquiry(inquiryId, store);
  if (!inquiry) return null;

  const websiteOrder = inquiry.websiteOrderId ? await getWebsiteOrder(inquiry.websiteOrderId, store) : undefined;

  // listAiJobsByWebsiteOrder()는 createdAt 내림차순(최신 우선)이므로 [0]이 가장 최근 Job이다.
  const aiJob = websiteOrder ? (await listAiJobsByWebsiteOrder(websiteOrder.id, store))[0] : undefined;

  const latestWebsiteId = websiteOrder?.websiteIds[websiteOrder.websiteIds.length - 1];
  const website = latestWebsiteId
    ? (await listWebsites(store)).find((record) => record.id === latestWebsiteId)
    : undefined;

  const isSuccess = aiJob?.status === "Success";
  const isFailed = aiJob?.status === "Failed" || aiJob?.status === "Cancelled";

  let status: ExternalInquiryStatus;
  if (isFailed) {
    status = "Failed";
  } else if (isSuccess) {
    status = "Completed";
  } else if (aiJob?.status === "Running") {
    status = "Running";
  } else if (aiJob) {
    status = "JobCreated";
  } else if (websiteOrder) {
    status = "OrderCreated";
  } else {
    status = "Received";
  }

  const error = isFailed
    ? aiJob?.error ?? (aiJob?.status === "Cancelled" ? "제작이 취소되었습니다." : "알 수 없는 오류가 발생했습니다.")
    : null;

  const completedAt = isSuccess ? aiJob?.finishedAt ?? null : null;

  return {
    inquiryId: inquiry.id,
    status,
    stages: {
      received: { done: true, at: inquiry.createdAt },
      orderCreated: { done: Boolean(websiteOrder), at: websiteOrder?.createdAt ?? null },
      jobCreated: { done: Boolean(aiJob), at: aiJob?.createdAt ?? null },
      running: { done: Boolean(aiJob?.startedAt), at: aiJob?.startedAt ?? null },
      websiteGenerated: { done: Boolean(website), at: website?.createdAt ?? null },
      deployed: { done: website?.deploymentStatus === "Success", at: null },
      completed: { done: status === "Completed", at: completedAt },
      failed: { done: status === "Failed", at: isFailed ? aiJob?.finishedAt ?? null : null },
    },
    error,
    order: websiteOrder
      ? { id: websiteOrder.id, name: websiteOrder.name, siteType: websiteOrder.siteType, status: websiteOrder.status }
      : null,
    website: website
      ? {
          id: website.id,
          name: website.name,
          siteType: website.siteType,
          previewUrl: null,
          deployUrl: website.deployment?.url ?? null,
        }
      : null,
    completedAt,
  };
}
