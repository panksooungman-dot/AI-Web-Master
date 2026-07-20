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
 * AiJob 조회는 WebsiteOrderRecord.aiJobIds가 아니라 listAiJobsByWebsiteOrder()를 쓴다 —
 * 실제 파이프라인(app/api/external/inquiries/route.ts)이 AiJob 생성 후 addAiJobToWebsiteOrder()를
 * 호출하지 않아 aiJobIds가 항상 빈 배열로 남기 때문(실제 저장 데이터로 확인). AiJobRecord
 * 자신의 websiteOrderId 역참조로 직접 찾는 listAiJobsByWebsiteOrder()는 이 문제와 무관하게
 * 항상 정확하다. 하나의 WebsiteOrder가 재시도 등으로 여러 AiJob/Website를 가질 수 있으므로,
 * 항상 "가장 최근" 항목을 현재 진행 상태로 취급한다.
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
  /** 실제 배포 파이프라인은 이 저장소에 아직 없다 — 항상 done:false, at:null. */
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
  /** 실 배포 파이프라인 미구현 — 항상 null. 필드는 계약 안정성을 위해 유지한다. */
  previewUrl: string | null;
  /** 실 배포 파이프라인 미구현 — 항상 null. 필드는 계약 안정성을 위해 유지한다. */
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
      deployed: { done: false, at: null },
      completed: { done: status === "Completed", at: completedAt },
      failed: { done: status === "Failed", at: isFailed ? aiJob?.finishedAt ?? null : null },
    },
    error,
    order: websiteOrder
      ? { id: websiteOrder.id, name: websiteOrder.name, siteType: websiteOrder.siteType, status: websiteOrder.status }
      : null,
    website: website
      ? { id: website.id, name: website.name, siteType: website.siteType, previewUrl: null, deployUrl: null }
      : null,
    completedAt,
  };
}
