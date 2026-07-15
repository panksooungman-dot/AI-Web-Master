import { describe, expect, it } from "vitest";
import { inferSiteType, planToWebsiteBuildInputs } from "../../lib/design/website-build-adapter";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";

function buildPlan(input: DesignPlanInput): DesignPlanRecord {
  return {
    id: "design-plan-adapter-test",
    input,
    content: buildDefaultDesignPlan(input),
    simulated: true,
    createdAt: new Date().toISOString(),
  };
}

describe("Website Build Adapter — lib/design/website-build-adapter.ts", () => {
  describe("inferSiteType()", () => {
    it("matches an exact id (case-insensitive)", () => {
      expect(inferSiteType("dental")).toBe("dental");
      expect(inferSiteType("Dental")).toBe("dental");
      expect(inferSiteType("  RESTAURANT  ")).toBe("restaurant");
    });

    it("matches a Korean label substring in free-text projectType", () => {
      expect(inferSiteType("치과 웹사이트")).toBe("dental");
      expect(inferSiteType("동네 병원 홈페이지 리뉴얼")).toBe("hospital");
      expect(inferSiteType("소규모 레스토랑 소개 페이지")).toBe("restaurant");
      expect(inferSiteType("교육 플랫폼")).toBe("education");
    });

    it("falls back to 'website' when nothing matches", () => {
      expect(inferSiteType("SaaS 대시보드")).toBe("website");
      expect(inferSiteType("")).toBe("website");
      expect(inferSiteType("   ")).toBe("website");
    });
  });

  describe("planToWebsiteBuildInputs()", () => {
    it("maps Design Plan input fields onto Website Builder inputs", () => {
      const plan = buildPlan({
        projectName: "Bright Smile Dental",
        projectType: "치과 웹사이트",
        requirements: "온라인 예약, 진료 안내가 필요합니다.",
        targetUsers: "지역 주민, 30~50대",
      });

      const inputs = planToWebsiteBuildInputs(plan);

      expect(inputs).toEqual({
        name: "Bright Smile Dental",
        businessType: "치과 웹사이트",
        audience: "지역 주민, 30~50대",
        brand: "Bright Smile Dental",
        language: "Korean",
        siteType: "dental",
      });
    });

    it("falls back siteType to 'website' for unrecognized project types", () => {
      const plan = buildPlan({
        projectName: "Acme SaaS",
        projectType: "SaaS 대시보드",
        requirements: "대시보드, 로그인이 필요합니다.",
        targetUsers: "B2B 고객",
      });

      expect(planToWebsiteBuildInputs(plan).siteType).toBe("website");
    });
  });
});
