import { describe, expect, it } from "vitest";
import { generateEstimate } from "../../lib/estimates/generator";
import type { EstimateInput } from "../../lib/estimates/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: EstimateInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "About", "Service", "Contact"],
  recommendedFunctions: ["Reservation", "Inquiry"],
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개와 예약 기능이 필요합니다.",
  budget: "500만원",
};

const VALID_JUDGMENT = {
  lineItems: [
    { name: "Home 페이지", description: "메인 페이지 디자인·개발", estimatedHours: 10 },
    { name: "예약 기능", description: "온라인 예약 시스템", estimatedHours: 20 },
  ],
  priceRangeMin: 3_000_000,
  priceRangeMax: 4_500_000,
  timelineWeeks: 3,
  assumptions: ["제공된 요구사항 기준 산정", "디자인 시안 1회 수정 포함"],
  summary: "브라이트 카페의 예약 기능이 포함된 홈페이지 제작 견적입니다.",
};

describe("Estimate Generator — generateEstimate()", () => {
  it("uses the AI-provided judgment (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.result.currency).toBe("KRW");
    expect(outcome.result.lineItems).toEqual(VALID_JUDGMENT.lineItems);
    expect(outcome.result.priceRangeMin).toBe(3_000_000);
    expect(outcome.result.priceRangeMax).toBe(4_500_000);
    expect(outcome.result.timelineWeeks).toBe(3);
    expect(outcome.result.summary).toBe(VALID_JUDGMENT.summary);
  });

  it("falls back to a deterministic estimate (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.currency).toBe("KRW");
    // 4 recommended pages + 2 recommended functions + 1 overhead line item
    expect(outcome.result.lineItems).toHaveLength(7);
    expect(outcome.result.priceRangeMin).toBeGreaterThan(0);
    expect(outcome.result.priceRangeMax).toBeGreaterThan(outcome.result.priceRangeMin);
    expect(outcome.result.timelineWeeks).toBeGreaterThanOrEqual(1);
    expect(outcome.result.summary.length).toBeGreaterThan(0);
  });

  it("falls back to a deterministic estimate (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.summary.length).toBeGreaterThan(0);
  });

  it("falls back when a required judgment field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, timelineWeeks: undefined };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when lineItems is empty (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, lineItems: [] };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("clamps priceRangeMax up to priceRangeMin if the AI response inverts them", async () => {
    const inverted = { ...VALID_JUDGMENT, priceRangeMin: 5_000_000, priceRangeMax: 3_000_000 };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(inverted) });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.priceRangeMax).toBeGreaterThanOrEqual(outcome.result.priceRangeMin);
  });

  it("strips a ```json code fence before parsing (same convention as lib/ai-analysis/analysis.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generateEstimate(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.summary).toBe(VALID_JUDGMENT.summary);
  });

  it("scales the deterministic fallback estimate with more recommended pages/functions", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const small = await generateEstimate({ ...BASE_INPUT, recommendedPages: ["Home"], recommendedFunctions: [] }, fakeChat);
    const large = await generateEstimate(
      { ...BASE_INPUT, recommendedPages: ["Home", "About", "Service", "Portfolio", "FAQ", "Contact", "Blog"], recommendedFunctions: ["Reservation", "Payment", "Login"] },
      fakeChat
    );

    expect(large.result.priceRangeMin).toBeGreaterThan(small.result.priceRangeMin);
    expect(large.result.timelineWeeks).toBeGreaterThanOrEqual(small.result.timelineWeeks);
  });
});
