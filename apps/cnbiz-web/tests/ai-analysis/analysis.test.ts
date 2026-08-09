import { describe, expect, it, vi } from "vitest";
import type { ExtractedDocument } from "../../lib/attachments/extractText";

// generateAnalysis()가 첨부 문서 원문을 실제로 chatFn에 넘기는 프롬프트에 삽입하는지만 검증한다
// — extractDocumentTexts() 자체의 fetch/파싱/에러 처리는 tests/attachments/extractText.test.ts가
// 이미 다룬다. vi.mock()은 파일 최상단으로 호이스팅되므로, 참조하는 mock 함수는 vi.hoisted()로
// 함께 끌어올려야 한다(그냥 const로 선언하면 호이스팅 시점에 아직 초기화되지 않아 에러가 난다).
const { extractDocumentTextsMock } = vi.hoisted(() => ({
  extractDocumentTextsMock: vi.fn(async (): Promise<ExtractedDocument[]> => []),
}));
vi.mock("../../lib/attachments/extractText", () => ({
  extractDocumentTexts: extractDocumentTextsMock,
}));

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

  it("still succeeds (simulated:false) when the model wraps the fence in leading/trailing prose (real-model habit, lib/ai/json.ts)", async () => {
    const withProse =
      "Here is my analysis:\n```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```\nLet me know if you need more detail.";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: withProse });

    const outcome = await generateAnalysis(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.detectedBusinessType).toBe("Restaurant");
  });

  it("falls back to the industry field when siteType has no WEBSITE_TYPES match", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const outcome = await generateAnalysis({ ...BASE_INPUT, siteType: "unknown-type" }, fakeChat);

    expect(outcome.result.detectedBusinessType).toBe("카페/외식업");
  });

  it("appends extracted document text to the prompt sent to chatFn when attachments contain readable documents", async () => {
    extractDocumentTextsMock.mockResolvedValueOnce([
      { url: "https://x/requirements.pdf", text: "매장은 3층 규모이며 예약 기능이 필수입니다." },
    ]);

    let capturedMessage = "";
    const fakeChat = async (message: string): Promise<ChatResult> => {
      capturedMessage = message;
      return { success: true, content: JSON.stringify(VALID_JUDGMENT) };
    };

    await generateAnalysis({ ...BASE_INPUT, uploadedFiles: ["https://x/requirements.pdf"] }, fakeChat);

    expect(capturedMessage).toContain("=== 첨부 문서 원문 ===");
    expect(capturedMessage).toContain("매장은 3층 규모이며 예약 기능이 필수입니다.");
  });

  it("does not add a document section when no attached document yields extractable text", async () => {
    extractDocumentTextsMock.mockResolvedValueOnce([]);

    let capturedMessage = "";
    const fakeChat = async (message: string): Promise<ChatResult> => {
      capturedMessage = message;
      return { success: true, content: JSON.stringify(VALID_JUDGMENT) };
    };

    await generateAnalysis(BASE_INPUT, fakeChat);

    expect(capturedMessage).not.toContain("=== 첨부 문서 원문 ===");
  });
});
