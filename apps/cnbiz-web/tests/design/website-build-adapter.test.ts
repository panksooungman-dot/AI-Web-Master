import { describe, expect, it } from "vitest";
import { buildAdditionalContext, inferSiteType, planToWebsiteBuildInputs } from "../../lib/design/website-build-adapter";
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

      expect(inputs).toMatchObject({
        name: "Bright Smile Dental",
        businessType: "치과 웹사이트",
        audience: "지역 주민, 30~50대",
        brand: "Bright Smile Dental",
        language: "Korean",
        siteType: "dental",
      });
      // buildDefaultDesignPlan()이 항상 채워 넣는 projectSummary·requirements가 그대로
      // 딸려와야 한다 — Content Engine으로 전달되는 다리(website-build-document-adapter.ts
      // 경유)가 끊기지 않았는지 확인.
      expect(inputs.additionalContext).toContain("치과 웹사이트");
      expect(inputs.additionalContext).toContain("온라인 예약, 진료 안내가 필요합니다.");
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

  describe("buildAdditionalContext() (2026-09-17 — Design 체인↔Content Engine 연결)", () => {
    it("includes the project summary, verbatim customer requirements, and feature list", () => {
      const plan = buildPlan({
        projectName: "사색찬미한정식",
        projectType: "파주 광탄 한정식 전문점",
        requirements: "대표 메뉴·가격·매장 사진이 실제 내용으로 반영되어야 합니다.",
        targetUsers: "지역 주민, 30~50대",
      });

      const context = buildAdditionalContext(plan);

      expect(context).toContain("Project summary:");
      expect(context).toContain("파주 광탄 한정식 전문점");
      expect(context).toContain("Customer requirements (verbatim): 대표 메뉴·가격·매장 사진이 실제 내용으로 반영되어야 합니다.");
      expect(context).toContain("Key features:");
      // buildDefaultDesignPlan()의 결정론적 기본 Feature 중 하나가 실제로 포함되는지 확인
      // (지어낸 값이 아니라 이미 생성된 featureList를 그대로 옮긴 것인지 검증).
      expect(context).toContain(plan.content.featureList[0].name);
      expect(context).toContain(plan.content.featureList[0].description);
    });

    it("skips sections that are empty instead of inserting blank lines", () => {
      const plan: DesignPlanRecord = {
        id: "empty-sections-test",
        input: { projectName: "X", projectType: "Y", requirements: "", targetUsers: "Z" },
        content: {
          requirementAnalysis: {
            projectSummary: "",
            functionalRequirements: [],
            nonFunctionalRequirements: [],
            businessRules: [],
            targetUsers: [],
          },
          featureList: [],
          siteMap: [],
          userFlows: [],
          screenList: [],
        },
        simulated: true,
        createdAt: new Date().toISOString(),
      };

      expect(buildAdditionalContext(plan)).toBe("");
    });
  });
});
