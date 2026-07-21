import { describe, expect, it } from "vitest";
import { computeCompleteness } from "../../lib/ai-analysis/score";
import type { AIAnalysisInput } from "../../lib/ai-analysis/types";

const FULL_INPUT: AIAnalysisInput = {
  companyName: "브라이트 카페",
  contactName: "홍길동",
  email: "hong@example.com",
  phone: "010-1234-5678",
  siteType: "restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다. 메뉴 소개가 필요합니다.",
  industry: "카페/외식업",
  survey: {
    브랜드컬러: "베이지톤",
    참고사이트: "https://example.com/reference",
    도메인: "brightcafe.com",
  },
  uploadedFiles: ["https://example.com/uploads/logo.png", "https://example.com/uploads/interior.jpg"],
};

const EMPTY_INPUT: AIAnalysisInput = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  siteType: "",
  requirements: "",
};

describe("AI Analysis — computeCompleteness()", () => {
  it("scores 100 when every checklist item is present", () => {
    const { completeness, missingItems } = computeCompleteness(FULL_INPUT);
    expect(completeness).toBe(100);
    expect(missingItems).toHaveLength(0);
  });

  it("scores 0 and lists all 10 items as missing for a fully empty input", () => {
    const { completeness, missingItems } = computeCompleteness(EMPTY_INPUT);
    expect(completeness).toBe(0);
    expect(missingItems).toHaveLength(10);
    expect(missingItems.every((item) => item.required)).toBe(true);
  });

  it("is deterministic — same input always produces the same score", () => {
    const first = computeCompleteness(FULL_INPUT);
    const second = computeCompleteness(FULL_INPUT);
    expect(first).toEqual(second);
  });

  it("detects a logo file via filename pattern and separates it from other photos", () => {
    const logoOnly = { ...EMPTY_INPUT, uploadedFiles: ["https://example.com/company-logo.png"] };
    const { missingItems } = computeCompleteness(logoOnly);
    expect(missingItems.find((item) => item.id === "company_logo")).toBeUndefined();
    expect(missingItems.find((item) => item.id === "service_images")).toBeDefined();
  });

  it("treats a short requirements string as missing service_description (below the 10-char threshold)", () => {
    const { missingItems } = computeCompleteness({ ...EMPTY_INPUT, requirements: "짧음" });
    expect(missingItems.find((item) => item.id === "service_description")).toBeDefined();
  });

  it("recognizes survey answers by loose key/value pattern matching (브랜드컬러/도메인/참고사이트)", () => {
    const { missingItems } = computeCompleteness({
      ...EMPTY_INPUT,
      survey: { 선호컬러: "네이비", 희망도메인: "mysite.com", 참고할만한곳: "없음" },
    });
    expect(missingItems.find((item) => item.id === "brand_color")).toBeUndefined();
    expect(missingItems.find((item) => item.id === "domain")).toBeUndefined();
    expect(missingItems.find((item) => item.id === "reference_site")).toBeUndefined();
  });

  it("recognizes contact info from either email or phone alone", () => {
    expect(
      computeCompleteness({ ...EMPTY_INPUT, email: "a@b.com" }).missingItems.find(
        (item) => item.id === "contact_info"
      )
    ).toBeUndefined();
    expect(
      computeCompleteness({ ...EMPTY_INPUT, phone: "010-0000-0000" }).missingItems.find(
        (item) => item.id === "contact_info"
      )
    ).toBeUndefined();
  });
});
