import { describe, expect, it } from "vitest";
import { generateSpecification } from "../../lib/specifications/generator";
import type { SpecificationInput } from "../../lib/specifications/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: SpecificationInput = {
  companyName: "브라이트 카페",
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "About", "Service", "Contact"],
  recommendedFunctions: ["Reservation", "Inquiry"],
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개와 예약 기능이 필요합니다.",
};

const VALID_JUDGMENT = {
  overview: "브라이트 카페의 예약 기반 홈페이지 기능 명세서입니다.",
  pages: [
    { name: "Home", description: "메인 소개 페이지" },
    { name: "Contact", description: "문의 페이지" },
  ],
  features: [
    { name: "Reservation", description: "온라인 예약 시스템", priority: "High" },
    { name: "Inquiry", description: "문의 폼", priority: "Medium" },
  ],
  adminFeatures: ["예약 내역 관리", "문의 내역 관리"],
  apis: [
    { method: "POST", path: "/api/reservations", description: "예약 생성" },
    { method: "GET", path: "/api/reservations", description: "예약 목록 조회" },
  ],
  dbOverview: "Reservation·Inquiry 테이블을 중심으로 구성됩니다.",
  scopeIncluded: ["4개 페이지 디자인", "예약 기능 구현"],
  scopeExcluded: ["결제 연동"],
  techStack: ["Next.js", "TypeScript", "Supabase"],
  deliverables: ["배포된 웹사이트", "소스코드"],
};

describe("Specification Generator — generateSpecification()", () => {
  it("uses the AI-provided judgment (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_JUDGMENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.provider).toBe("anthropic");
    expect(outcome.result.overview).toBe(VALID_JUDGMENT.overview);
    expect(outcome.result.pages).toEqual(VALID_JUDGMENT.pages);
    expect(outcome.result.features).toEqual(VALID_JUDGMENT.features);
    expect(outcome.result.apis).toEqual(VALID_JUDGMENT.apis);
    expect(outcome.result.techStack).toEqual(VALID_JUDGMENT.techStack);
  });

  it("falls back to a deterministic specification (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    // 4 recommended pages
    expect(outcome.result.pages).toHaveLength(4);
    // 2 recommended functions
    expect(outcome.result.features).toHaveLength(2);
    expect(outcome.result.adminFeatures.length).toBeGreaterThan(0);
    expect(outcome.result.apis.length).toBeGreaterThan(0);
    expect(outcome.result.techStack.length).toBeGreaterThan(0);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back to a deterministic specification (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
    expect(outcome.result.overview.length).toBeGreaterThan(0);
  });

  it("falls back when a required judgment field is missing (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, dbOverview: undefined };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when pages is empty (all-or-nothing validation)", async () => {
    const broken = { ...VALID_JUDGMENT, pages: [] };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("falls back when a feature has an invalid priority value (all-or-nothing validation)", async () => {
    const broken = {
      ...VALID_JUDGMENT,
      features: [{ name: "Reservation", description: "예약", priority: "Urgent" }],
    };
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(broken) });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(true);
  });

  it("strips a ```json code fence before parsing (same convention as lib/estimates/generator.ts)", async () => {
    const fenced = "```json\n" + JSON.stringify(VALID_JUDGMENT) + "\n```";
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: fenced });

    const outcome = await generateSpecification(BASE_INPUT, fakeChat);

    expect(outcome.simulated).toBe(false);
    expect(outcome.result.overview).toBe(VALID_JUDGMENT.overview);
  });

  it("scales the deterministic fallback specification with more recommended pages/functions", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const small = await generateSpecification(
      { ...BASE_INPUT, recommendedPages: ["Home"], recommendedFunctions: [] },
      fakeChat
    );
    const large = await generateSpecification(
      {
        ...BASE_INPUT,
        recommendedPages: ["Home", "About", "Service", "Portfolio", "FAQ", "Contact", "Blog"],
        recommendedFunctions: ["Reservation", "Payment", "Login"],
      },
      fakeChat
    );

    expect(large.result.pages.length).toBeGreaterThan(small.result.pages.length);
    expect(large.result.features.length).toBeGreaterThan(small.result.features.length);
  });
});
