/**
 * Customer Portal — 순수 읽기 전용 조회/조합 계층. 새 Domain이 아니다: 자체 CollectionStore·
 * Registry·저장 로직이 전혀 없고, 이미 존재하는 7개 Domain(Inquiry/Client/WebsiteOrder/
 * Estimate/Specification/Timeline/Contract/Proposal/Website)의 registry 조회 함수만 읽기
 * 전용으로 호출해 고객이 보기 좋은 형태로 조합한다(lib/customerProjects/summary.ts가 과거에
 * 썼던 것과 동일한 "순수 읽기 전용 join" 원칙 — 그 파일도 별도 Domain으로 취급되지 않았다).
 *
 * 권한 경계도 이 파일 안에서 강제한다: `findClientByEmail(email)`로 찾은 Client의
 * `websiteOrderIds`에 없는 orderId는 존재 여부와 무관하게 null을 반환한다(다른 고객의
 * orderId를 시도해도 404로만 보이고, "존재하지만 내 것이 아님"과 "존재하지 않음"을 구분해
 * 알려주지 않는다 — lib/auth/auth.ts의 로그인 오류 메시지가 "미가입 이메일"과 "잘못된 비밀번호"를
 * 구분하지 않는 것과 동일한 정보 노출 최소화 원칙).
 *
 * 다른 모든 registry와 동일하게 `store` 파라미터를 받아 그대로 하위 호출에 전달한다 — 이 파일
 * 자체는 CollectionStore를 소유하지 않지만, 테스트에서 격리된 fs store를 주입할 수 있어야
 * 하므로 기본값(getDefaultStore())을 갖는 옵셔널 파라미터로 관통시킨다.
 */
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { findClientByEmail } from "@/lib/clients/registry";
import { getInquiry } from "@/lib/inquiries/registry";
import { getWebsiteOrder } from "@/lib/websiteOrders/registry";
import { getWebsite, type DeploymentStatus } from "@/lib/websites/registry";
import { getProject, type ProjectStatus } from "@/lib/projects/registry";
import { workflowEngine } from "@/lib/workflows/engine";
import { listEstimatesByInquiry } from "@/lib/estimates/registry";
import { listSpecificationsByInquiry } from "@/lib/specifications/registry";
import { listTimelinesByInquiry } from "@/lib/timeline/registry";
import { listContractsByInquiry } from "@/lib/contracts/registry";
import { listProposalsByInquiry } from "@/lib/proposals/registry";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import type { ContractRecord } from "@/lib/contracts/types";
import type { ProposalRecord } from "@/lib/proposals/types";
import type { WebsiteOrderRecord, WebsiteOrderStatus } from "@/lib/websiteOrders/types";
import type { WorkflowRunStatus } from "@/lib/workflows/types";
import type { AIAnalysisResult } from "@/lib/ai-analysis/types";

export interface CustomerOrderDocumentFlags {
  hasAnalysis: boolean;
  hasEstimate: boolean;
  hasSpecification: boolean;
  hasTimeline: boolean;
  hasContract: boolean;
  hasProposal: boolean;
}

export interface CustomerOrderSummary extends CustomerOrderDocumentFlags {
  websiteOrderId: string;
  inquiryId: string;
  companyName: string;
  siteType: string;
  status: WebsiteOrderStatus;
  createdAt: string;
  deploymentStatus: DeploymentStatus | null;
  deploymentUrl: string | null;
}

export interface CustomerOrderDetail extends CustomerOrderDocumentFlags {
  websiteOrderId: string;
  inquiryId: string;
  companyName: string;
  contactName: string;
  siteType: string;
  requirements: string;
  status: WebsiteOrderStatus;
  createdAt: string;
  analysis: AIAnalysisResult | null;
  analyzedAt: string | null;
  estimate: EstimateRecord | null;
  specification: SpecificationRecord | null;
  timeline: TimelineRecord | null;
  contract: ContractRecord | null;
  proposal: ProposalRecord | null;
  deploymentStatus: DeploymentStatus | null;
  deploymentUrl: string | null;
  /** lib/projects(Project Manager)에 자동 등록된 Project(WebsiteOrder.projectId)의 상태 — 등록 전이면 null. */
  projectStatus: ProjectStatus | null;
  /** 그 Project의 workspaceId로 실행된 가장 최근 Workflow Run(lib/workflows) 상태 — 연결된 Run이 없으면 null. */
  workflowStatus: WorkflowRunStatus | null;
}

async function resolveDeployment(
  order: WebsiteOrderRecord,
  store: CollectionStore
): Promise<{ deploymentStatus: DeploymentStatus | null; deploymentUrl: string | null }> {
  const latestWebsiteId = order.websiteIds[order.websiteIds.length - 1];
  if (!latestWebsiteId) {
    return { deploymentStatus: null, deploymentUrl: null };
  }

  const website = await getWebsite(latestWebsiteId, store);
  return {
    deploymentStatus: website?.deploymentStatus ?? null,
    deploymentUrl: website?.deployment?.url ?? null,
  };
}

/**
 * WebsiteOrder.projectId(있으면)로 lib/projects의 Project를 조회하고, 그 Project의 workspaceId로
 * 실행된 가장 최근 Workflow Run(lib/workflows)의 상태를 찾는다. AI Job 경로(triggerWorkspaceProvisioning)로
 * 자동 등록된 Project는 Workflow Engine을 거치지 않으므로(직접 createProject 호출) 대부분
 * workflowStatus는 null이다 — 이는 결함이 아니라 두 자동화 경로가 서로 다르다는 사실을 그대로
 * 반영한 것이다(존재하지 않는 실행을 지어내지 않는다).
 */
async function resolveProjectAndWorkflowStatus(
  order: WebsiteOrderRecord,
  store: CollectionStore
): Promise<{ projectStatus: ProjectStatus | null; workflowStatus: WorkflowRunStatus | null }> {
  if (!order.projectId) {
    return { projectStatus: null, workflowStatus: null };
  }

  const project = await getProject(order.projectId, store);
  if (!project) {
    return { projectStatus: null, workflowStatus: null };
  }

  const latestRun = workflowEngine
    .listRuns()
    .filter((run) => run.context.workspaceId === project.workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return { projectStatus: project.status, workflowStatus: latestRun?.status ?? null };
}

async function resolveDocumentFlags(
  inquiryId: string,
  hasAnalysis: boolean,
  store: CollectionStore
): Promise<CustomerOrderDocumentFlags> {
  const [estimates, specifications, timelines, contracts, proposals] = await Promise.all([
    listEstimatesByInquiry(inquiryId, store),
    listSpecificationsByInquiry(inquiryId, store),
    listTimelinesByInquiry(inquiryId, store),
    listContractsByInquiry(inquiryId, store),
    listProposalsByInquiry(inquiryId, store),
  ]);

  return {
    hasAnalysis,
    hasEstimate: estimates.length > 0,
    hasSpecification: specifications.length > 0,
    hasTimeline: timelines.length > 0,
    hasContract: contracts.length > 0,
    hasProposal: proposals.length > 0,
  };
}

/** `/customer/dashboard`·`/customer/orders` 목록 화면 — 로그인 이메일과 일치하는 Client의 주문만. */
export async function findCustomerOrders(
  email: string,
  store: CollectionStore = getDefaultStore()
): Promise<CustomerOrderSummary[]> {
  const client = await findClientByEmail(email, store);
  if (!client) return [];

  const orders = (await Promise.all(client.websiteOrderIds.map((id) => getWebsiteOrder(id, store)))).filter(
    (order): order is WebsiteOrderRecord => Boolean(order)
  );

  const summaries = await Promise.all(
    orders.map(async (order) => {
      const inquiry = await getInquiry(order.inquiryId, store);
      const [flags, deployment] = await Promise.all([
        resolveDocumentFlags(order.inquiryId, Boolean(inquiry?.analysis), store),
        resolveDeployment(order, store),
      ]);

      const summary: CustomerOrderSummary = {
        websiteOrderId: order.id,
        inquiryId: order.inquiryId,
        companyName: client.companyName,
        siteType: order.siteType,
        status: order.status,
        createdAt: order.createdAt,
        ...flags,
        ...deployment,
      };
      return summary;
    })
  );

  return summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * `/customer/orders/[id]` 상세 화면 — orderId가 이 email의 Client에 속하지 않으면(존재하지 않거나
 * 다른 고객 소유) null을 반환한다. 이 검사가 "본인 데이터만 조회 가능"의 실제 권한 강제 지점이다.
 */
export async function getCustomerOrderDetail(
  email: string,
  websiteOrderId: string,
  store: CollectionStore = getDefaultStore()
): Promise<CustomerOrderDetail | null> {
  const client = await findClientByEmail(email, store);
  if (!client || !client.websiteOrderIds.includes(websiteOrderId)) {
    return null;
  }

  const order = await getWebsiteOrder(websiteOrderId, store);
  if (!order) return null;

  const inquiry = await getInquiry(order.inquiryId, store);
  if (!inquiry) return null;

  const [estimates, specifications, timelines, contracts, proposals, deployment, projectAndWorkflow] =
    await Promise.all([
      listEstimatesByInquiry(order.inquiryId, store),
      listSpecificationsByInquiry(order.inquiryId, store),
      listTimelinesByInquiry(order.inquiryId, store),
      listContractsByInquiry(order.inquiryId, store),
      listProposalsByInquiry(order.inquiryId, store),
      resolveDeployment(order, store),
      resolveProjectAndWorkflowStatus(order, store),
    ]);

  return {
    websiteOrderId: order.id,
    inquiryId: order.inquiryId,
    companyName: client.companyName,
    contactName: client.contactName,
    siteType: order.siteType,
    requirements: order.requirements,
    status: order.status,
    createdAt: order.createdAt,
    analysis: inquiry.analysis ?? null,
    analyzedAt: inquiry.analyzedAt ?? null,
    hasAnalysis: Boolean(inquiry.analysis),
    estimate: estimates[0] ?? null,
    specification: specifications[0] ?? null,
    timeline: timelines[0] ?? null,
    contract: contracts[0] ?? null,
    proposal: proposals[0] ?? null,
    hasEstimate: estimates.length > 0,
    hasSpecification: specifications.length > 0,
    hasTimeline: timelines.length > 0,
    hasContract: contracts.length > 0,
    hasProposal: proposals.length > 0,
    ...deployment,
    ...projectAndWorkflow,
  };
}
