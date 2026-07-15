import { describe, expect, it } from "vitest";
import {
  buildDefaultPrototype,
  generatePrototype,
  parsePrototypeContent,
} from "../../lib/design/prototype-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
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

const STORYBOARD: StoryboardRecord = {
  id: "storyboard-1",
  planId: PLAN.id,
  content: buildDefaultStoryboard(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const WIREFRAME: WireframeRecord = {
  id: "wireframe-1",
  storyboardId: STORYBOARD.id,
  planId: PLAN.id,
  content: buildDefaultWireframe(STORYBOARD),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const VALID_CONTENT = {
  screens: [{ screen: "홈", path: "/" }],
  clickFlows: [
    {
      name: "Primary Flow",
      steps: [{ step: 1, screen: "홈", element: "Button", action: "Click", leadsTo: "Complete" }],
    },
  ],
  navigationFlow: [{ from: "홈", to: "예약", trigger: "클릭" }],
  screenTransitions: [{ from: "홈", to: "예약", type: "fade", durationMs: 300 }],
  interactionMap: [
    { screen: "홈", interactions: [{ element: "Button", trigger: "click", result: "다음 화면으로 이동" }] },
  ],
  componentActions: [{ component: "Button", action: "Trigger Action", description: "다음 화면으로 이동" }],
  userJourneys: [
    {
      persona: "지역 주민",
      goal: "예약하기",
      steps: [{ step: 1, screen: "홈", action: "예약 버튼 클릭", emotion: "기대" }],
    },
  ],
  animationPreviews: [{ screen: "홈", animation: "페이드인", trigger: "onLoad", durationMs: 400 }],
  preview: { startScreen: "홈", totalScreens: 1, totalInteractions: 1, summary: "1개 화면 프로토타입" },
};

describe("Prototype Generator — buildDefaultPrototype()", () => {
  it("produces one screen ref per Wireframe layout", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.screens.length).toBe(WIREFRAME.content.layouts.length);
    expect(content.screens.map((s) => s.screen)).toEqual(WIREFRAME.content.layouts.map((l) => l.screen));
  });

  it("produces a single Primary Flow click flow walking every screen in order, ending in Complete", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.clickFlows).toHaveLength(1);
    const steps = content.clickFlows[0].steps;
    expect(steps.map((s) => s.screen)).toEqual(WIREFRAME.content.layouts.map((l) => l.screen));
    expect(steps[steps.length - 1].leadsTo).toBe("Complete");
    for (let i = 0; i < steps.length - 1; i++) {
      expect(steps[i].leadsTo).toBe(steps[i + 1].screen);
    }
  });

  it("navigationFlow connects consecutive screens in layout order", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const screens = WIREFRAME.content.layouts;
    expect(content.navigationFlow).toHaveLength(screens.length - 1);
    content.navigationFlow.forEach((edge, i) => {
      expect(edge.from).toBe(screens[i].screen);
      expect(edge.to).toBe(screens[i + 1].screen);
    });
  });

  it("screenTransitions has one entry per navigationFlow edge with a valid transition type", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.screenTransitions).toHaveLength(content.navigationFlow.length);
    for (const transition of content.screenTransitions) {
      expect(["fade", "slide-left", "slide-right", "slide-up", "modal", "none"]).toContain(transition.type);
      expect(transition.durationMs).toBeGreaterThan(0);
    }
  });

  it("interactionMap covers every screen with at least one interaction", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.interactionMap).toHaveLength(WIREFRAME.content.layouts.length);
    for (const map of content.interactionMap) {
      expect(map.interactions.length).toBeGreaterThan(0);
    }
  });

  it("componentActions covers every distinct component used across the wireframe, no duplicates", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    const componentTypes = content.componentActions.map((a) => a.component);
    expect(new Set(componentTypes).size).toBe(componentTypes.length);
    expect(componentTypes.length).toBeGreaterThan(0);
  });

  it("userJourneys contains one journey covering every screen", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.userJourneys).toHaveLength(1);
    expect(content.userJourneys[0].steps).toHaveLength(WIREFRAME.content.layouts.length);
    expect(content.userJourneys[0].steps[content.userJourneys[0].steps.length - 1].emotion).toBe("만족");
  });

  it("animationPreviews has one entry per screen", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.animationPreviews).toHaveLength(WIREFRAME.content.layouts.length);
  });

  it("preview summarizes totalScreens/totalInteractions consistently with the other fields", () => {
    const content = buildDefaultPrototype(WIREFRAME);
    expect(content.preview.startScreen).toBe(WIREFRAME.content.layouts[0].screen);
    expect(content.preview.totalScreens).toBe(content.screens.length);
    const expectedInteractions = content.interactionMap.reduce((sum, m) => sum + m.interactions.length, 0);
    expect(content.preview.totalInteractions).toBe(expectedInteractions);
  });
});

describe("Prototype Generator — parsePrototypeContent()", () => {
  it("parses a well-formed JSON string", () => {
    expect(parsePrototypeContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parsePrototypeContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for invalid JSON", () => {
    expect(parsePrototypeContent("not json")).toBeNull();
  });

  it("returns null when a required top-level key is missing (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, preview: undefined };
    expect(parsePrototypeContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when an interaction element is not a known component type", () => {
    const broken = {
      ...VALID_CONTENT,
      interactionMap: [{ screen: "홈", interactions: [{ element: "NotAComponent", trigger: "click", result: "x" }] }],
    };
    expect(parsePrototypeContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a screen transition has an invalid type", () => {
    const broken = {
      ...VALID_CONTENT,
      screenTransitions: [{ from: "홈", to: "예약", type: "zoom-blur", durationMs: 300 }],
    };
    expect(parsePrototypeContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a click flow step is malformed", () => {
    const broken = {
      ...VALID_CONTENT,
      clickFlows: [{ name: "x", steps: [{ step: "not-a-number", screen: "홈", element: "Button", action: "Click", leadsTo: "Complete" }] }],
    };
    expect(parsePrototypeContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Prototype Generator — generatePrototype()", () => {
  it("returns the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generatePrototype(WIREFRAME, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to buildDefaultPrototype() (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const result = await generatePrototype(WIREFRAME, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultPrototype(WIREFRAME));
  });

  it("falls back to buildDefaultPrototype() (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const result = await generatePrototype(WIREFRAME, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultPrototype(WIREFRAME));
  });
});
