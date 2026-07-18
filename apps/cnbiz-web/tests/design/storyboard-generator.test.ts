import { describe, expect, it } from "vitest";
import {
  buildDefaultStoryboard,
  generateStoryboard,
  parseStoryboardContent,
} from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { ChatResult } from "../../lib/ai/bridge";

const PLAN_INPUT: DesignPlanInput = {
  projectName: "Bright Smile Dental",
  projectType: "치과 웹사이트",
  requirements: "온라인 예약, 진료 안내, 오시는 길 안내가 필요합니다.",
  targetUsers: "지역 주민, 30~50대",
};

const PLAN: DesignPlanRecord = {
  id: "design-plan-1",
  input: PLAN_INPUT,
  content: buildDefaultDesignPlan(PLAN_INPUT),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const VALID_CONTENT = {
  screenFlow: [{ screen: "홈", path: "/", description: "메인 화면" }],
  userJourneys: [
    {
      persona: "지역 주민",
      goal: "예약하기",
      steps: [{ step: 1, screen: "홈", goal: "예약 버튼 클릭", emotion: "기대" }],
    },
  ],
  navigationFlow: [{ from: "홈", to: "예약", trigger: "클릭" }],
  pageSequence: [{ order: 1, screen: "홈", path: "/" }],
  screenDescriptions: [{ screen: "홈", path: "/", purpose: "소개", keyElements: ["Header", "Hero"] }],
};

describe("Storyboard Generator — buildDefaultStoryboard()", () => {
  it("produces a fully populated StoryboardContent derived from the plan's Site Map/Screen List", () => {
    const content = buildDefaultStoryboard(PLAN);

    expect(content.screenFlow.length).toBe(PLAN.content.screenList.length);
    expect(content.pageSequence.length).toBe(PLAN.content.screenList.length);
    expect(content.screenDescriptions.length).toBe(PLAN.content.screenList.length);
    expect(content.navigationFlow.length).toBe(PLAN.content.screenList.length - 1);
    expect(content.userJourneys.length).toBeGreaterThan(0);
  });

  it("screen names in screenFlow match the plan's Screen List names exactly", () => {
    const content = buildDefaultStoryboard(PLAN);
    expect(content.screenFlow.map((n) => n.screen)).toEqual(PLAN.content.screenList.map((s) => s.name));
  });

  it("navigationFlow connects consecutive screens in Screen List order", () => {
    const content = buildDefaultStoryboard(PLAN);
    const screens = PLAN.content.screenList;

    content.navigationFlow.forEach((edge, i) => {
      expect(edge.from).toBe(screens[i].name);
      expect(edge.to).toBe(screens[i + 1].name);
    });
  });

  it("pageSequence is ordered starting at 1", () => {
    const content = buildDefaultStoryboard(PLAN);
    expect(content.pageSequence.map((p) => p.order)).toEqual(
      PLAN.content.screenList.map((_, i) => i + 1)
    );
  });

  it("falls back to a generic persona when the plan has no target users", () => {
    const emptyTargetPlan: DesignPlanRecord = {
      ...PLAN,
      content: { ...PLAN.content, requirementAnalysis: { ...PLAN.content.requirementAnalysis, targetUsers: [] } },
    };
    const content = buildDefaultStoryboard(emptyTargetPlan);
    expect(content.userJourneys[0].persona).toBe("일반 방문자");
  });
});

describe("Storyboard Generator — parseStoryboardContent()", () => {
  it("parses a well-formed JSON string", () => {
    expect(parseStoryboardContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseStoryboardContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for invalid JSON", () => {
    expect(parseStoryboardContent("not json")).toBeNull();
  });

  it("returns null when a required top-level key is missing (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, navigationFlow: undefined };
    expect(parseStoryboardContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a userJourney step is malformed", () => {
    const broken = {
      ...VALID_CONTENT,
      userJourneys: [{ persona: "X", goal: "Y", steps: [{ step: "not-a-number", screen: "홈", goal: "click" }] }],
    };
    expect(parseStoryboardContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when screenDescriptions.keyElements is not a string array", () => {
    const broken = {
      ...VALID_CONTENT,
      screenDescriptions: [{ screen: "홈", path: "/", purpose: "p", keyElements: [1, 2] }],
    };
    expect(parseStoryboardContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Storyboard Generator — generateStoryboard()", () => {
  it("returns the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateStoryboard(PLAN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to buildDefaultStoryboard() (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const result = await generateStoryboard(PLAN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultStoryboard(PLAN));
  });

  it("falls back to buildDefaultStoryboard() (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const result = await generateStoryboard(PLAN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultStoryboard(PLAN));
  });
});
