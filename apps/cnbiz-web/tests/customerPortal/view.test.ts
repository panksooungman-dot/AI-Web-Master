import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createClient, addWebsiteOrderToClient } from "../../lib/clients/registry";
import { createInquiry, saveInquiryAnalysis } from "../../lib/inquiries/registry";
import { createWebsiteOrder, addWebsiteToOrder, setWebsiteOrderProject } from "../../lib/websiteOrders/registry";
import { createWebsiteRecord, updateWebsiteDeployment } from "../../lib/websites/registry";
import { createEstimate } from "../../lib/estimates/registry";
import { createSpecification } from "../../lib/specifications/registry";
import { createTimeline } from "../../lib/timeline/registry";
import { createContract } from "../../lib/contracts/registry";
import { createProposal } from "../../lib/proposals/registry";
import { createProject } from "../../lib/projects/registry";
import { workflowEngine } from "../../lib/workflows/engine";
import { findCustomerOrders, getCustomerOrderDetail } from "../../lib/customerPortal/view";
import type { AIAnalysisResult } from "../../lib/ai-analysis/types";
import type { WorkflowRun } from "../../lib/workflows/types";
import type { EstimateInput, EstimateResult } from "../../lib/estimates/types";
import type { SpecificationInput, SpecificationResult } from "../../lib/specifications/types";
import type { TimelineInput, TimelineResult } from "../../lib/timeline/types";
import type { ContractInput, ContractResult } from "../../lib/contracts/types";
import type { ProposalInput, ProposalResult } from "../../lib/proposals/types";

const ANALYSIS: AIAnalysisResult = {
  completeness: 70,
  missingItems: [{ id: "logo", title: "회사 로고", required: true, reason: "필요" }],
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Contact"],
  recommendedFunctions: ["Reservation"],
  confidence: 0.8,
  summary: "요약",
};

const ESTIMATE_INPUT: EstimateInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Contact"],
  recommendedFunctions: ["Reservation"],
  requirements: "예약 기능",
};
const ESTIMATE_RESULT: EstimateResult = {
  currency: "KRW",
  lineItems: [{ name: "Home", description: "메인", estimatedHours: 8 }],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  timelineWeeks: 3,
  assumptions: [],
  summary: "견적 요약",
};

const SPEC_INPUT: SpecificationInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Contact"],
  recommendedFunctions: ["Reservation"],
  requirements: "예약 기능",
};
const SPEC_RESULT: SpecificationResult = {
  overview: "명세 개요",
  pages: [{ name: "Home", description: "메인" }],
  features: [{ name: "Reservation", description: "예약", priority: "High" }],
  adminFeatures: ["문의 관리"],
  apis: [{ method: "POST", path: "/api/inquiries", description: "문의" }],
  dbOverview: "DB 개요",
  scopeIncluded: ["Home 개발"],
  scopeExcluded: ["결제"],
  techStack: ["Next.js"],
  deliverables: ["배포된 웹사이트"],
};

const TIMELINE_INPUT: TimelineInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능",
  pageCount: 2,
  featureCount: 1,
  scopeIncluded: ["Home 개발"],
  estimateTimelineWeeks: 3,
};
const TIMELINE_RESULT: TimelineResult = {
  overview: "일정 개요",
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  phases: [{ name: "기획", description: "요구사항 확정", durationDays: 3, startOffsetDays: 0 }],
  milestones: [{ name: "요구사항 완료", description: "기획 종료", dueOffsetDays: 3 }],
  weeklyPlan: [{ weekNumber: 1, focus: "기획", tasks: ["요구사항 정리"] }],
  assumptions: [],
};

const CONTRACT_INPUT: ContractInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능",
  scopeIncluded: ["Home 개발"],
  scopeExcluded: ["결제"],
  deliverables: ["배포된 웹사이트"],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  milestoneNames: ["요구사항 완료"],
};
const CONTRACT_RESULT: ContractResult = {
  title: "브라이트 카페 계약서",
  overview: "계약 개요",
  purpose: "목적",
  developmentScope: ["Home 개발"],
  excludedScope: ["결제"],
  schedule: "4주 이내",
  contractAmount: { amount: 1_250_000, currency: "KRW", vatIncluded: false },
  paymentTerms: ["계약금", "중도금", "잔금"],
  deliverables: ["배포된 웹사이트"],
  acceptanceCriteria: ["검수 기준"],
  maintenance: "30일 무상",
  changeRequestPolicy: "별도 협의",
  terminationClause: "서면 통지",
  intellectualProperty: "잔금 후 귀속",
  confidentiality: "비밀유지",
  specialTerms: [],
};

const PROPOSAL_INPUT: ProposalInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능",
  pageNames: ["Home"],
  featureNames: ["Reservation"],
  techStack: ["Next.js"],
  scopeIncluded: ["Home 개발"],
  deliverables: ["배포된 웹사이트"],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  currency: "KRW",
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  milestoneNames: ["요구사항 완료"],
  contractAmount: 1_250_000,
  maintenanceSummary: "30일 무상",
};
const PROPOSAL_RESULT: ProposalResult = {
  title: "브라이트 카페 제안서",
  executiveSummary: "요약",
  overview: "개요",
  requirementsAnalysis: "분석",
  objectives: ["목표"],
  solutionOverview: "솔루션",
  pages: [{ name: "Home", description: "메인" }],
  features: [{ name: "Reservation", description: "예약" }],
  techStack: ["Next.js"],
  schedule: "4주",
  cost: { amount: 1_250_000, currency: "KRW", description: "계약 금액" },
  developmentScope: ["Home 개발"],
  deliverables: ["배포된 웹사이트"],
  maintenancePlan: "30일 무상",
  expectedBenefits: ["효과"],
  companyIntroduction: "회사 소개",
  contactInfo: "문의처",
};

/**
 * workflowEngine.createRun()은 내부적으로 getWorkflow()를 store 인자 없이 호출해 항상
 * getDefaultStore()를 건드리므로(lib/workflows/engine.ts, 이 테스트가 격리한 fs store와 무관),
 * 격리된 테스트에서는 대신 이 in-memory singleton의 runs Map에 직접 WorkflowRun을 심어
 * resolveProjectAndWorkflowStatus()의 조회 로직만 검증한다. Engine 자체의 동작은 바꾸지 않는다.
 */
function seedWorkflowRun(workspaceId: string, status: WorkflowRun["status"]): void {
  const run: WorkflowRun = {
    id: `run-test-${workspaceId}`,
    workflowId: "workflow-test",
    status,
    currentStepIndex: 0,
    context: { cwd: "/tmp/test", workspaceId },
    steps: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };

  (workflowEngine as unknown as { runs: Map<string, WorkflowRun> }).runs.set(run.id, run);
}

describe("Customer Portal — lib/customerPortal/view.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "customer-portal-view-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  /** 이메일이 일치하는 Client 하나와, 문서 5종이 전부 연결된 WebsiteOrder 하나를 만든다. */
  async function seedFullOrder(email: string) {
    const client = await createClient(
      { companyName: "브라이트 카페", contactName: "홍길동", email, phone: "010-0000-0000" },
      store
    );
    const inquiry = await createInquiry(
      {
        source: "manual",
        companyName: "브라이트 카페",
        contactName: "홍길동",
        email,
        phone: "010-0000-0000",
        siteType: "restaurant",
        requirements: "예약 기능이 필요합니다.",
      },
      store
    );
    await saveInquiryAnalysis(inquiry.id, ANALYSIS, store);

    const order = await createWebsiteOrder(
      { clientId: client.id, inquiryId: inquiry.id, name: "브라이트 카페 홈페이지", siteType: "restaurant", requirements: "예약 기능" },
      store
    );
    await addWebsiteOrderToClient(client.id, order.id, store);

    const website = await createWebsiteRecord(
      { name: "브라이트 카페", siteType: "restaurant", outDir: "/tmp/out", status: "Success", simulatedContent: true },
      store
    );
    await updateWebsiteDeployment(
      website.id,
      { deploymentStatus: "Success", deployment: { vercelProjectId: "p1", vercelProjectName: "bright-cafe", deploymentId: "d1", url: "https://bright-cafe.vercel.app" } },
      store
    );
    await addWebsiteToOrder(order.id, website.id, store);

    await createEstimate(
      { inquiryId: inquiry.id, websiteOrderId: order.id, input: ESTIMATE_INPUT, result: ESTIMATE_RESULT, simulated: true },
      store
    );
    await createSpecification(
      { inquiryId: inquiry.id, websiteOrderId: order.id, input: SPEC_INPUT, result: SPEC_RESULT, simulated: true },
      store
    );
    await createTimeline(
      {
        inquiryId: inquiry.id,
        websiteOrderId: order.id,
        estimateId: "estimate-1",
        specificationId: "specification-1",
        input: TIMELINE_INPUT,
        result: TIMELINE_RESULT,
        simulated: true,
      },
      store
    );
    await createContract(
      {
        inquiryId: inquiry.id,
        websiteOrderId: order.id,
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        input: CONTRACT_INPUT,
        result: CONTRACT_RESULT,
        simulated: true,
      },
      store
    );
    await createProposal(
      {
        inquiryId: inquiry.id,
        websiteOrderId: order.id,
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        contractId: "contract-1",
        input: PROPOSAL_INPUT,
        result: PROPOSAL_RESULT,
        simulated: true,
      },
      store
    );

    return { client, inquiry, order, website };
  }

  describe("findCustomerOrders()", () => {
    it("returns an empty array when no Client matches the email", async () => {
      expect(await findCustomerOrders("nobody@example.com", store)).toEqual([]);
    });

    it("returns the order(s) belonging to the matched Client, with document flags and deployment info", async () => {
      const { order } = await seedFullOrder("customer@example.com");

      const orders = await findCustomerOrders("customer@example.com", store);

      expect(orders).toHaveLength(1);
      expect(orders[0].websiteOrderId).toBe(order.id);
      expect(orders[0].hasAnalysis).toBe(true);
      expect(orders[0].hasEstimate).toBe(true);
      expect(orders[0].hasSpecification).toBe(true);
      expect(orders[0].hasTimeline).toBe(true);
      expect(orders[0].hasContract).toBe(true);
      expect(orders[0].hasProposal).toBe(true);
      expect(orders[0].deploymentStatus).toBe("Success");
      expect(orders[0].deploymentUrl).toBe("https://bright-cafe.vercel.app");
    });

    it("matches email case-insensitively (same normalization as lib/clients/registry.ts::findClientByEmail)", async () => {
      await seedFullOrder("customer@example.com");

      const orders = await findCustomerOrders("CUSTOMER@EXAMPLE.COM", store);
      expect(orders).toHaveLength(1);
    });

    it("does not return another customer's orders", async () => {
      await seedFullOrder("customer-a@example.com");
      await seedFullOrder("customer-b@example.com");

      const ordersA = await findCustomerOrders("customer-a@example.com", store);
      const ordersB = await findCustomerOrders("customer-b@example.com", store);

      expect(ordersA).toHaveLength(1);
      expect(ordersB).toHaveLength(1);
      expect(ordersA[0].websiteOrderId).not.toBe(ordersB[0].websiteOrderId);
    });
  });

  describe("getCustomerOrderDetail() — authorization boundary", () => {
    it("returns null when the orderId does not exist at all", async () => {
      await seedFullOrder("customer@example.com");
      expect(await getCustomerOrderDetail("customer@example.com", "does-not-exist", store)).toBeNull();
    });

    it("returns null when the orderId belongs to a DIFFERENT customer (core security property — this is the actual '본인 데이터만 조회 가능' enforcement point)", async () => {
      const { order: orderA } = await seedFullOrder("customer-a@example.com");
      await seedFullOrder("customer-b@example.com");

      const result = await getCustomerOrderDetail("customer-b@example.com", orderA.id, store);
      expect(result).toBeNull();
    });

    it("returns null for an email with no matching Client at all", async () => {
      const { order } = await seedFullOrder("customer@example.com");
      expect(await getCustomerOrderDetail("stranger@example.com", order.id, store)).toBeNull();
    });

    it("returns the full detail (all 5 documents + analysis + deployment) when the order belongs to this email", async () => {
      const { order } = await seedFullOrder("customer@example.com");

      const detail = await getCustomerOrderDetail("customer@example.com", order.id, store);

      expect(detail).not.toBeNull();
      expect(detail!.websiteOrderId).toBe(order.id);
      expect(detail!.analysis?.detectedBusinessType).toBe("Restaurant");
      expect(detail!.estimate?.result.summary).toBe("견적 요약");
      expect(detail!.specification?.result.overview).toBe("명세 개요");
      expect(detail!.timeline?.result.totalDurationWeeks).toBe(4);
      expect(detail!.contract?.result.title).toBe("브라이트 카페 계약서");
      expect(detail!.proposal?.result.title).toBe("브라이트 카페 제안서");
      expect(detail!.deploymentStatus).toBe("Success");
      expect(detail!.deploymentUrl).toBe("https://bright-cafe.vercel.app");
    });

    it("reports hasXxx:false and null documents when no documents have been generated yet", async () => {
      const client = await createClient(
        { companyName: "신규 고객", contactName: "김철수", email: "new@example.com", phone: "010-1111-2222" },
        store
      );
      const inquiry = await createInquiry(
        {
          source: "manual",
          companyName: "신규 고객",
          contactName: "김철수",
          email: "new@example.com",
          phone: "010-1111-2222",
          siteType: "restaurant",
          requirements: "요구사항",
        },
        store
      );
      const order = await createWebsiteOrder(
        { clientId: client.id, inquiryId: inquiry.id, name: "신규 고객 홈페이지", siteType: "restaurant", requirements: "요구사항" },
        store
      );
      await addWebsiteOrderToClient(client.id, order.id, store);

      const detail = await getCustomerOrderDetail("new@example.com", order.id, store);

      expect(detail).not.toBeNull();
      expect(detail!.hasAnalysis).toBe(false);
      expect(detail!.hasEstimate).toBe(false);
      expect(detail!.estimate).toBeNull();
      expect(detail!.deploymentStatus).toBeNull();
      expect(detail!.deploymentUrl).toBeNull();
    });

    it("reports projectStatus/workflowStatus as null when no Project has been auto-provisioned yet", async () => {
      const { order } = await seedFullOrder("customer@example.com");

      const detail = await getCustomerOrderDetail("customer@example.com", order.id, store);

      expect(detail!.projectStatus).toBeNull();
      expect(detail!.workflowStatus).toBeNull();
    });

    it("connects projectStatus once lib/aiJobs/worker.ts::triggerWorkspaceProvisioning() links a Project (order.projectId)", async () => {
      const { order } = await seedFullOrder("customer@example.com");

      const project = await createProject(
        {
          name: order.name,
          company: "브라이트 카페",
          type: "AI 생성 웹사이트",
          description: order.requirements,
          workspaceId: "workspace-test-1",
          workspaceName: "bright-cafe",
          workspacePath: "/tmp/bright-cafe",
          autoProvisioned: true,
          websiteOrderId: order.id,
        },
        store
      );
      await setWebsiteOrderProject(order.id, project.id, store);

      const detail = await getCustomerOrderDetail("customer@example.com", order.id, store);
      expect(detail!.projectStatus).toBe("Active");
      expect(detail!.workflowStatus).toBeNull();
    });

    it("connects workflowStatus to the latest Workflow Run whose context.workspaceId matches the Project's workspaceId", async () => {
      const { order } = await seedFullOrder("customer@example.com");

      const project = await createProject(
        {
          name: order.name,
          company: "브라이트 카페",
          type: "AI 생성 웹사이트",
          description: order.requirements,
          workspaceId: "workspace-test-2",
          workspaceName: "bright-cafe-2",
          workspacePath: "/tmp/bright-cafe-2",
          autoProvisioned: true,
          websiteOrderId: order.id,
        },
        store
      );
      await setWebsiteOrderProject(order.id, project.id, store);
      seedWorkflowRun(project.workspaceId, "Running");

      const detail = await getCustomerOrderDetail("customer@example.com", order.id, store);
      expect(detail!.workflowStatus).toBe("Running");
    });
  });
});
