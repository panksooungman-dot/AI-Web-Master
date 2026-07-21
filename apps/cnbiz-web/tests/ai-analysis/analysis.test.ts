import { describe, expect, it } from "vitest";
import { generateAnalysis } from "../../lib/ai-analysis/analysis";
import { computeCompleteness } from "../../lib/ai-analysis/score";
import type { AIAnalysisInput } from "../../lib/ai-analysis/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: AIAnalysisInput = {
  companyName: "브라이트 카페",
  contactName: "홍길동",
  email: "hong@example.com",
  phone: "010-1234-5678",
  siteType: "restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개와 예약 기능이 필요합니다.",
  industry: "카페/외식업",
};

const VALID_JUDGMENT = {
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "About", "Service", "Contact"],
  recommendedFunctions: ["Reservation", "Inquiry"],
  confidence: 0.85,
  summary: "브라이트 카페의 감성적인 홈페이지 제작 요청입니다. 메뉴 소개와 예약 기능이 핵심입니다.",
};

describe("AI Analysis — generateAnalysis()", () => {
  it("uses the AI-provided judgment (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.result.detectedBusinessType).toBe("Restaurant");
    expect(outcome.result.recommendedPages).toEqual(VALID_JUDGMENT.recommendedPages);
    expect(outcome.result.recommendedFunctions).toEqual(VALID_JUDGMENT.recommendedFunctions);
    expect(outcome.result.confidence).toBe(0.85);
    expect(outcome.result.summary).toBe(VALID_JUDGMENT.summary);
  });

  it("always uses score.ts's deterministic completeness/missingItems regardless of the AI judgment", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
    });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);
    const expected = computeCompleteness(BASE_INPUT);

    expect(outcome.result.completeness).toBe(expected.completeness);
    expect(outcome.result.missingItems).toEqual(expected.missingItems);
  });

  it("falls back to a deterministic judgment (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.detectedBusinessType).toBe("레스토랑"); // siteType "restaurant" -> WEBSITE_TYPES label
    expect(outcome.result.recommendedPages.length).toBeGreaterThan(0);
    expect(outcome.result.recommendedFunctions.length).toBeGreaterThan(0);
    expect(outcome.result.confidence).toBeGreaterThanOrEqual(0);
    expect(outcome.result.confidence).toBeLessThanOrEqual(1);
    expect(outcome.result.summary.length).toBeGreaterThan(0);
  });

  it("falls back to a deterministic judgment (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.summary.length).toBeGreaterThan(0);
  });

  it("falls back when a required judgment field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, confidence: undefined };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("clamps an out-of-range confidence value from the AI response into [0, 1]", async () => {
    const overconfident = { ...VALID_JUDGMENT, confidence: 1.5 };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(overconfident) });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.confidence).toBe(1);
  });

  it("strips a ```json code fence before parsing (same convention as lib/design/generator.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.detectedBusinessType).toBe("Restaurant");
  });

  it("falls back to the industry field when siteType has no WEBSITE_TYPES match", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const outcome = await generateAnalysis({ ...BASE_INPUT, siteType: "unknown-type" }, fakeChat);

    expect(outcome.result.detectedBusinessType).toBe("카페/외식업");
  });
});
