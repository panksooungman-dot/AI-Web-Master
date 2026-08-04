import { describe, expect, it } from "vitest";
import { generateProposal } from "../../lib/proposals/generator";
import type { ProposalInput } from "../../lib/proposals/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: ProposalInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개와 예약 기능이 필요합니다.",
  pageNames: ["Home", "About", "Service", "Contact"],
  featureNames: ["Reservation", "Inquiry"],
  techStack: ["Next.js", "TypeScript", "Tailwind CSS"],
  scopeIncluded: ["4개 페이지 디자인", "예약 기능 구현"],
  deliverables: ["배포된 웹사이트", "소스코드"],
  priceRangeMin: 3_000_000,
  priceRangeMax: 4_500_000,
  currency: "KRW",
  totalDurationWeeks: 5,
  totalDurationDays: 34,
  milestoneNames: ["요구사항 완료", "디자인 완료", "개발 완료", "QA 완료", "배포 완료"],
  contractAmount: 3_750_000,
  maintenanceSummary: "배포 후 30일간 무상 하자보수를 제공한다.",
};

const VALID_JUDGMENT = {
  title: "브라이트 카페 홈페이지 구축 제안서",
  executiveSummary: "브라이트 카페에 예약 기반 홈페이지를 구축하는 제안입니다.",
  overview: "브라이트 카페의 홈페이지 제작 프로젝트 개요입니다.",
  requirementsAnalysis: "고객은 감성적인 디자인과 예약 기능을 요구했습니다.",
  objectives: ["브랜드 이미지 강화", "온라인 예약 채널 확보"],
  solutionOverview: "Next.js 기반의 반응형 홈페이지를 제안합니다.",
  pages: [
    { name: "Home", description: "메인 소개 페이지" },
    { name: "Contact", description: "문의 페이지" },
  ],
  features: [{ name: "Reservation", description: "온라인 예약 시스템" }],
  techStack: ["Next.js", "TypeScript"],
  schedule: "총 5주간 진행됩니다.",
  cost: { amount: 3_750_000, currency: "KRW", description: "계약서 기준 확정 금액" },
  developmentScope: ["4개 페이지 디자인", "예약 기능 구현"],
  deliverables: ["배포된 웹사이트", "소스코드"],
  maintenancePlan: "30일 무상 하자보수를 제공합니다.",
  expectedBenefits: ["전문적인 브랜드 이미지 구축", "예약 전환율 향상"],
  companyIntroduction: "CNBIZ는 AI 기반 웹 개발사입니다.",
  contactInfo: "담당자에게 문의 바랍니다.",
};

describe("Proposal Generator — generateProposal()", () => {
  it("uses the AI-provided judgment (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.result.title).toBe(VALID_JUDGMENT.title);
    expect(outcome.result.pages).toEqual(VALID_JUDGMENT.pages);
    expect(outcome.result.features).toEqual(VALID_JUDGMENT.features);
    expect(outcome.result.cost).toEqual(VALID_JUDGMENT.cost);
    expect(outcome.result.objectives).toEqual(VALID_JUDGMENT.objectives);
  });

  it("falls back to a deterministic proposal (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.pages).toHaveLength(4);
    expect(outcome.result.features).toHaveLength(2);
    expect(outcome.result.techStack).toEqual(BASE_INPUT.techStack);
    expect(outcome.result.developmentScope).toEqual(BASE_INPUT.scopeIncluded);
    expect(outcome.result.deliverables).toEqual(BASE_INPUT.deliverables);
    expect(outcome.result.cost.amount).toBe(BASE_INPUT.contractAmount);
    expect(outcome.result.cost.currency).toBe("KRW");
    expect(outcome.result.maintenancePlan).toBe(BASE_INPUT.maintenanceSummary);
    expect(outcome.result.objectives.length).toBeGreaterThan(0);
    expect(outcome.result.expectedBenefits.length).toBeGreaterThan(0);
    expect(outcome.result.companyIntroduction.length).toBeGreaterThan(0);
    expect(outcome.result.contactInfo.length).toBeGreaterThan(0);
    expect(outcome.result.executiveSummary.length).toBeGreaterThan(0);
  });

  it("falls back to a deterministic proposal (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back when a required judgment field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, companyIntroduction: undefined };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when pages is empty (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, pages: [] };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when cost is malformed (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, cost: { amount: "many", currency: "KRW", description: "" } };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("strips a ```json code fence before parsing (same convention as lib/estimates/generator.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generateProposal(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.title).toBe(VALID_JUDGMENT.title);
  });

  it("scales the deterministic fallback pages/features with the specification input", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const small = await generateProposal({ ...BASE_INPUT, pageNames: ["Home"], featureNames: [] }, fakeChat);
    const large = await generateProposal(
      { ...BASE_INPUT, pageNames: ["Home", "About", "Service", "Portfolio", "FAQ"], featureNames: ["Reservation", "Payment", "Login"] },
      fakeChat
    );

    expect(large.result.pages.length).toBeGreaterThan(small.result.pages.length);
    expect(large.result.features.length).toBeGreaterThan(small.result.features.length);
  });

  it("uses the contract amount (not the estimate price range) as the fallback proposal cost", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateProposal({ ...BASE_INPUT, contractAmount: 5_000_000 }, fakeChat);

    expect(outcome.result.cost.amount).toBe(5_000_000);
  });
});
