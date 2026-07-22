import { describe, expect, it } from "vitest";
import { buildDefaultPlanning, generatePlanning, parsePlanningContent } from "../../lib/planning/generator";
import type { PlanningInput } from "../../lib/planning/types";
import type { AIAnalysisResult } from "../../lib/ai-analysis/types";
import type { ChatResult } from "../../lib/ai/bridge";

const ANALYSIS: AIAnalysisResult = {
  completeness: 70,
  missingItems: [],
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Menu", "Reservation", "Contact"],
  recommendedFunctions: ["Reservation", "Inquiry"],
  confidence: 0.8,
  summary: "브라이트 카페의 감성적인 홈페이지 제작 요청입니다.",
};

const BASE_INPUT: PlanningInput = {
  companyName: "브라이트 카페",
  siteType: "restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다.",
  analysis: ANALYSIS,
};

const VALID_CONTENT = {
  specification: {
    overview: "브라이트 카페의 예약 기반 홈페이지 프로젝트입니다.",
    pages: [
      { name: "Home", description: "메인 소개" },
      { name: "Menu", description: "메뉴 소개" },
    ],
    functions: [{ name: "Reservation", description: "예약 기능", priority: "High" }],
  },
  estimate: {
    currency: "KRW",
    lineItems: [
      { name: "기본 패키지", description: "기본 구성", unitPrice: 3000000, quantity: 1, amount: 3000000 },
    ],
    subtotal: 3000000,
    contingency: 300000,
    total: 3300000,
    assumptions: ["디자인 1회 확정"],
  },
  timeline: {
    phases: [{ name: "기획", description: "요구사항 확정", durationDays: 5, startOffsetDays: 0 }],
    totalDurationDays: 5,
  },
};

describe("Planning — generatePlanning()", () => {
  it("uses the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generatePlanning(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.content.specification.overview).toBe(VALID_CONTENT.specification.overview);
    expect(outcome.content.estimate.total).toBe(3300000);
    expect(outcome.content.timeline.totalDurationDays).toBe(5);
  });

  it("falls back to a deterministic plan (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generatePlanning(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.content.specification.pages.map((p) => p.name)).toEqual(ANALYSIS.recommendedPages);
    expect(outcome.content.specification.functions.map((f) => f.name)).toEqual(ANALYSIS.recommendedFunctions);
    expect(outcome.content.estimate.total).toBeGreaterThan(0);
    expect(outcome.content.timeline.totalDurationDays).toBeGreaterThan(0);
  });

  it("falls back to a deterministic plan (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generatePlanning(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when a required estimate field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_CONTENT, estimate: { ...VALID_CONTENT.estimate, total: undefined } };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generatePlanning(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("strips a ```json code fence before parsing (same convention as lib/design/generator.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generatePlanning(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.content.estimate.total).toBe(3300000);
  });
});

describe("Planning — buildDefaultPlanning() (rule-based fallback)", () => {
  it("derives pages/functions from AIAnalysisResult's recommendedPages/recommendedFunctions", () => {
    const content = buildDefaultPlanning(BASE_INPUT);

    expect(content.specification.pages.map((p) => p.name)).toEqual(ANALYSIS.recommendedPages);
    expect(content.specification.functions.map((f) => f.name)).toEqual(ANALYSIS.recommendedFunctions);
  });

  it("falls back to generic defaults when recommendedPages/recommendedFunctions are empty", () => {
    const emptyAnalysis: AIAnalysisResult = { ...ANALYSIS, recommendedPages: [], recommendedFunctions: [] };
    const content = buildDefaultPlanning({ ...BASE_INPUT, analysis: emptyAnalysis });

    expect(content.specification.pages.length).toBeGreaterThan(0);
    expect(content.specification.functions.length).toBeGreaterThan(0);
  });

  it("computes the estimate total as subtotal + contingency, scaled by page/function count", () => {
    const content = buildDefaultPlanning(BASE_INPUT);
    const expectedSubtotal = content.estimate.lineItems.reduce((sum, item) => sum + item.amount, 0);

    expect(content.estimate.subtotal).toBe(expectedSubtotal);
    expect(content.estimate.total).toBe(content.estimate.subtotal + content.estimate.contingency);

    const moreFunctions = buildDefaultPlanning({
      ...BASE_INPUT,
      analysis: { ...ANALYSIS, recommendedFunctions: [...ANALYSIS.recommendedFunctions, "Payment", "Login"] },
    });
    expect(moreFunctions.estimate.total).toBeGreaterThan(content.estimate.total);
  });

  it("computes a positive, sequential timeline with 5 phases and no overlapping offsets", () => {
    const content = buildDefaultPlanning(BASE_INPUT);

    expect(content.timeline.phases).toHaveLength(5);
    expect(content.timeline.totalDurationDays).toBeGreaterThan(0);

    let expectedOffset = 0;
    for (const phase of content.timeline.phases) {
      expect(phase.startOffsetDays).toBe(expectedOffset);
      expect(phase.durationDays).toBeGreaterThan(0);
      expectedOffset += phase.durationDays;
    }
    expect(expectedOffset).toBe(content.timeline.totalDurationDays);
  });
});

describe("Planning — parsePlanningContent()", () => {
  it("returns null for malformed JSON", () => {
    expect(parsePlanningContent("{not valid")).toBeNull();
  });

  it("returns null when specification.functions has an invalid priority", () => {
    const broken = {
      ...VALID_CONTENT,
      specification: {
        ...VALID_CONTENT.specification,
        functions: [{ name: "X", description: "d", priority: "Urgent" }],
      },
    };
    expect(parsePlanningContent(JSON.stringify(broken))).toBeNull();
  });

  it("parses valid content correctly", () => {
    const parsed = parsePlanningContent(JSON.stringify(VALID_CONTENT));
    expect(parsed).not.toBeNull();
    expect(parsed?.estimate.total).toBe(3300000);
  });
});
