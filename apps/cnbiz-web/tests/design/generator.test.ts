import { describe, expect, it } from "vitest";
import {
  buildDefaultDesignPlan,
  generateDesignPlan,
  parseDesignPlanContent,
} from "../../lib/design/generator";
import type { DesignPlanInput } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

const BASE_INPUT: DesignPlanInput = {
  projectName: "Bright Smile Dental",
  projectType: "치과 웹사이트",
  requirements: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
  targetUsers: "지역 주민, 30~50대",
};

const VALID_CONTENT = {
  requirementAnalysis: {
    projectSummary: "summary",
    functionalRequirements: ["f1"],
    nonFunctionalRequirements: ["n1"],
    businessRules: ["b1"],
    targetUsers: ["u1"],
  },
  featureList: [{ name: "Feature A", description: "desc", priority: "High" }],
  siteMap: [{ path: "/", title: "Home", children: [{ path: "/about", title: "About" }] }],
  userFlows: [
    {
      name: "Flow A",
      steps: [{ step: 1, screen: "Home", action: "Click", next: "Complete" }],
    },
  ],
  screenList: [{ name: "Home", path: "/", description: "desc", components: ["Header"] }],
};

describe("Design Generator — buildDefaultDesignPlan()", () => {
  it("produces a fully populated, non-empty DesignPlanContent for any input", () => {
    const content = buildDefaultDesignPlan(BASE_INPUT);

    expect(content.requirementAnalysis.projectSummary.length).toBeGreaterThan(0);
    expect(content.requirementAnalysis.functionalRequirements.length).toBeGreaterThan(0);
    expect(content.requirementAnalysis.nonFunctionalRequirements.length).toBeGreaterThan(0);
    expect(content.requirementAnalysis.businessRules.length).toBeGreaterThan(0);
    expect(content.requirementAnalysis.targetUsers).toEqual(["지역 주민, 30~50대"]);
    expect(content.featureList.length).toBeGreaterThan(0);
    expect(content.siteMap.length).toBeGreaterThan(0);
    expect(content.userFlows.length).toBeGreaterThan(0);
    expect(content.screenList.length).toBeGreaterThan(0);
  });

  it("falls back to a generic target user when none is provided", () => {
    const content = buildDefaultDesignPlan({ ...BASE_INPUT, targetUsers: "" });
    expect(content.requirementAnalysis.targetUsers).toEqual(["일반 방문자"]);
  });

  it("uses a generic project name placeholder when projectName is blank", () => {
    const content = buildDefaultDesignPlan({ ...BASE_INPUT, projectName: "  " });
    expect(content.requirementAnalysis.projectSummary).toContain("New Project");
  });
});

describe("Design Generator — parseDesignPlanContent()", () => {
  it("parses a well-formed JSON string", () => {
    const parsed = parseDesignPlanContent(JSON.stringify(VALID_CONTENT));
    expect(parsed).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseDesignPlanContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for invalid JSON", () => {
    expect(parseDesignPlanContent("not json")).toBeNull();
  });

  it("returns null when a required field is missing (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, featureList: undefined };
    expect(parseDesignPlanContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when featureList has an invalid priority value", () => {
    const broken = {
      ...VALID_CONTENT,
      featureList: [{ name: "X", description: "d", priority: "Urgent" }],
    };
    expect(parseDesignPlanContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when siteMap children are malformed", () => {
    const broken = {
      ...VALID_CONTENT,
      siteMap: [{ path: "/", title: "Home", children: [{ path: "/x" }] }],
    };
    expect(parseDesignPlanContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Design Generator — generateDesignPlan()", () => {
  it("returns the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateDesignPlan(BASE_INPUT, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("claude-sonnet-5");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to buildDefaultDesignPlan() (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const result = await generateDesignPlan(BASE_INPUT, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.provider).toBeUndefined();
    expect(result.content).toEqual(buildDefaultDesignPlan(BASE_INPUT));
  });

  it("falls back to buildDefaultDesignPlan() (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: "this is not json at all",
    });

    const result = await generateDesignPlan(BASE_INPUT, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultDesignPlan(BASE_INPUT));
  });
});
