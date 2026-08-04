import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createProposal, getProposal, listProposals, listProposalsByInquiry } from "../../lib/proposals/registry";
import type { ProposalInput, ProposalResult } from "../../lib/proposals/types";

const INPUT: ProposalInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "예약 기능이 필요합니다.",
  pageNames: ["Home"],
  featureNames: ["Reservation"],
  techStack: ["Next.js"],
  scopeIncluded: ["예약 기능 구현"],
  deliverables: ["배포된 웹사이트"],
  priceRangeMin: 1_000_000,
  priceRangeMax: 1_500_000,
  currency: "KRW",
  totalDurationWeeks: 4,
  totalDurationDays: 28,
  milestoneNames: ["요구사항 완료"],
  contractAmount: 1_250_000,
  maintenanceSummary: "30일 무상 하자보수",
};

const RESULT: ProposalResult = {
  title: "브라이트 카페 홈페이지 구축 제안서",
  executiveSummary: "요약",
  overview: "개요",
  requirementsAnalysis: "분석",
  objectives: ["목표1"],
  solutionOverview: "솔루션",
  pages: [{ name: "Home", description: "메인 페이지" }],
  features: [{ name: "Reservation", description: "예약 기능" }],
  techStack: ["Next.js"],
  schedule: "4주 이내 완료",
  cost: { amount: 1_250_000, currency: "KRW", description: "계약 금액" },
  developmentScope: ["예약 기능 구현"],
  deliverables: ["배포된 웹사이트"],
  maintenancePlan: "30일 무상 하자보수",
  expectedBenefits: ["효과1"],
  companyIntroduction: "회사 소개",
  contactInfo: "문의처",
};

describe("Proposal Registry — lib/proposals/registry.ts", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "proposals-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("listProposals() returns an empty array before anything is created", async () => {
    expect(await listProposals(store)).toEqual([]);
  });

  it("createProposal() persists a record with a generated id and timestamp", async () => {
    const record = await createProposal(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        contractId: "contract-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    expect(record.id).toBeTruthy();
    expect(record.inquiryId).toBe("inquiry-1");
    expect(record.estimateId).toBe("estimate-1");
    expect(record.specificationId).toBe("specification-1");
    expect(record.timelineId).toBe("timeline-1");
    expect(record.contractId).toBe("contract-1");
    expect(record.result).toEqual(RESULT);
    expect(record.createdAt).toBeTruthy();
    expect(await listProposals(store)).toHaveLength(1);
  });

  it("listProposals() returns newest first", async () => {
    const first = await createProposal(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        contractId: "contract-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );
    await new Promise((resolve) => setTimeout(resolve, 2));
    const second = await createProposal(
      {
        inquiryId: "inquiry-2",
        websiteOrderId: "order-2",
        estimateId: "estimate-2",
        specificationId: "specification-2",
        timelineId: "timeline-2",
        contractId: "contract-2",
        input: INPUT,
        result: RESULT,
        simulated: false,
      },
      store
    );

    const records = await listProposals(store);
    expect(records[0].id).toBe(second.id);
    expect(records[1].id).toBe(first.id);
  });

  it("getProposal() finds by id, undefined for unknown id", async () => {
    const record = await createProposal(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        contractId: "contract-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    expect((await getProposal(record.id, store))?.inquiryId).toBe("inquiry-1");
    expect(await getProposal("does-not-exist", store)).toBeUndefined();
  });

  it("listProposalsByInquiry() filters by inquiryId", async () => {
    await createProposal(
      {
        inquiryId: "inquiry-1",
        websiteOrderId: "order-1",
        estimateId: "estimate-1",
        specificationId: "specification-1",
        timelineId: "timeline-1",
        contractId: "contract-1",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );
    const own = await createProposal(
      {
        inquiryId: "inquiry-2",
        websiteOrderId: "order-2",
        estimateId: "estimate-2",
        specificationId: "specification-2",
        timelineId: "timeline-2",
        contractId: "contract-2",
        input: INPUT,
        result: RESULT,
        simulated: true,
      },
      store
    );

    const results = await listProposalsByInquiry("inquiry-2", store);
    expect(results.map((r) => r.id)).toEqual([own.id]);
  });
});
