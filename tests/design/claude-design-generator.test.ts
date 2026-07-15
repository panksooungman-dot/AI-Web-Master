import { describe, expect, it } from "vitest";
import {
  buildDefaultClaudeDesign,
  generateClaudeDesign,
  parseClaudeDesignContent,
} from "../../lib/design/claude-design-generator";
import { buildDefaultPrototype } from "../../lib/design/prototype-generator";
import { buildDefaultWireframe } from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
import type { WireframeRecord } from "../../lib/design/wireframe";
import type { PrototypeRecord } from "../../lib/design/prototype";
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

const PROTOTYPE: PrototypeRecord = {
  id: "prototype-1",
  wireframeId: WIREFRAME.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultPrototype(WIREFRAME),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const VALID_CONTENT = {
  designPrompt: "Design a multi-screen dental clinic website centered on booking an appointment.",
  uiPrompt: "Use a clean, modern UI with clear CTAs on every screen.",
  componentPrompt: "Design Header, Hero, Card, Form, Footer components consistently.",
  themePrompt: "Use a calming blue/white palette with an 8px spacing grid.",
  layoutPrompt: "Lay out each screen responsively across desktop, tablet, and mobile.",
};

describe("Claude Design Generator — buildDefaultClaudeDesign()", () => {
  it("produces all 5 non-empty prompt fields", () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    expect(content.designPrompt.length).toBeGreaterThan(0);
    expect(content.uiPrompt.length).toBeGreaterThan(0);
    expect(content.componentPrompt.length).toBeGreaterThan(0);
    expect(content.themePrompt.length).toBeGreaterThan(0);
    expect(content.layoutPrompt.length).toBeGreaterThan(0);
  });

  it("designPrompt references the prototype's start screen and screen count", () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    expect(content.designPrompt).toContain(PROTOTYPE.content.preview.startScreen);
    expect(content.designPrompt).toContain(String(PROTOTYPE.content.screens.length));
  });

  it("componentPrompt references every distinct component from componentActions", () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    const componentTypes = [...new Set(PROTOTYPE.content.componentActions.map((a) => a.component))];
    for (const type of componentTypes) {
      expect(content.componentPrompt).toContain(type);
    }
  });

  it("uiPrompt references every screen from the interaction map", () => {
    const content = buildDefaultClaudeDesign(PROTOTYPE);
    for (const map of PROTOTYPE.content.interactionMap) {
      expect(content.uiPrompt).toContain(map.screen);
    }
  });

  it("is deterministic across repeated calls with the same prototype", () => {
    expect(buildDefaultClaudeDesign(PROTOTYPE)).toEqual(buildDefaultClaudeDesign(PROTOTYPE));
  });
});

describe("Claude Design Generator — parseClaudeDesignContent()", () => {
  it("parses a well-formed JSON string", () => {
    expect(parseClaudeDesignContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseClaudeDesignContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for invalid JSON", () => {
    expect(parseClaudeDesignContent("not json")).toBeNull();
  });

  it("returns null when a required top-level key is missing (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, layoutPrompt: undefined };
    expect(parseClaudeDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a prompt field is an empty string", () => {
    const broken = { ...VALID_CONTENT, themePrompt: "   " };
    expect(parseClaudeDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a prompt field is not a string", () => {
    const broken = { ...VALID_CONTENT, uiPrompt: 123 };
    expect(parseClaudeDesignContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Claude Design Generator — generateClaudeDesign()", () => {
  it("returns the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateClaudeDesign(PROTOTYPE, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to buildDefaultClaudeDesign() (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const result = await generateClaudeDesign(PROTOTYPE, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultClaudeDesign(PROTOTYPE));
  });

  it("falls back to buildDefaultClaudeDesign() (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const result = await generateClaudeDesign(PROTOTYPE, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultClaudeDesign(PROTOTYPE));
  });
});
