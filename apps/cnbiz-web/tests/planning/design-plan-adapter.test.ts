import { describe, expect, it } from "vitest";
import { buildDesignPlanInputFromPlanning } from "../../lib/planning/design-plan-adapter";
import { buildDefaultPlanning } from "../../lib/planning/generator";
import type { PlanningInput } from "../../lib/planning/types";
import type { AIAnalysisResult } from "../../lib/ai-analysis/types";
import type { InquiryRecord } from "../../lib/inquiries/types";

const ANALYSIS: AIAnalysisResult = {
  completeness: 70,
  missingItems: [],
  detectedBusinessType: "Restaurant",
  recommendedPages: ["Home", "Menu", "Reservation", "Contact"],
  recommendedFunctions: ["Reservation", "Inquiry"],
  confidence: 0.8,
  summary: "브라이트 카페의 감성적인 홈페이지 제작 요청입니다.",
};

const PLANNING_INPUT: PlanningInput = {
  companyName: "브라이트 카페",
  siteType: "restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다.",
  analysis: ANALYSIS,
};

const INQUIRY: InquiryRecord = {
  id: "inquiry-1",
  source: "chatbot",
  companyName: "브라이트 카페",
  contactName: "홍길동",
  email: "hong@example.com",
  phone: "010-1234-5678",
  siteType: "restaurant",
  requirements: "감성적인 느낌의 카페 홈페이지를 만들고 싶습니다.",
  industry: "카페/외식업",
  status: "New",
  clientId: null,
  websiteOrderId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  analysis: ANALYSIS,
  analyzedAt: new Date().toISOString(),
};

describe("Planning → Design Automation adapter — buildDesignPlanInputFromPlanning()", () => {
  it("maps Inquiry + PlanningContent into a valid DesignPlanInput without calling Design Automation itself", () => {
    const planningContent = buildDefaultPlanning(PLANNING_INPUT);
    const input = buildDesignPlanInputFromPlanning(INQUIRY, planningContent);

    expect(input.projectName).toBe("브라이트 카페");
    expect(input.projectType).toBe("Restaurant");
    expect(input.targetUsers).toBe("카페/외식업 관련 고객");
    expect(input.requirements).toContain(INQUIRY.requirements);
    expect(input.requirements).toContain(planningContent.specification.overview);
    expect(input.requirements).toContain("Home");
  });

  it("falls back to contactName when companyName is blank", () => {
    const planningContent = buildDefaultPlanning(PLANNING_INPUT);
    const input = buildDesignPlanInputFromPlanning({ ...INQUIRY, companyName: "" }, planningContent);

    expect(input.projectName).toBe("홍길동");
  });

  it("falls back to siteType when the inquiry has no analysis (defensive — analysis should normally be present)", () => {
    const planningContent = buildDefaultPlanning(PLANNING_INPUT);
    const input = buildDesignPlanInputFromPlanning({ ...INQUIRY, analysis: null }, planningContent);

    expect(input.projectType).toBe("restaurant");
  });

  it("falls back to a generic targetUsers value when industry is missing", () => {
    const planningContent = buildDefaultPlanning(PLANNING_INPUT);
    const input = buildDesignPlanInputFromPlanning({ ...INQUIRY, industry: undefined }, planningContent);

    expect(input.targetUsers).toBe("일반 방문자");
  });
});
