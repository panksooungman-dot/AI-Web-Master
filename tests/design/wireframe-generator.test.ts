import { describe, expect, it } from "vitest";
import {
  buildDefaultWireframe,
  generateWireframe,
  parseWireframeContent,
} from "../../lib/design/wireframe-generator";
import { buildDefaultStoryboard } from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { DesignPlanInput, DesignPlanRecord } from "../../lib/design/types";
import type { StoryboardRecord } from "../../lib/design/storyboard";
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

const VALID_CONTENT = {
  layouts: [
    {
      screen: "홈",
      path: "/",
      desktop: {
        breakpoint: "desktop",
        columns: 12,
        sections: [{ name: "Header", components: ["Header"], description: "상단 헤더" }],
      },
      tablet: {
        breakpoint: "tablet",
        columns: 8,
        sections: [{ name: "Header", components: ["Header"], description: "상단 헤더" }],
      },
      mobile: {
        breakpoint: "mobile",
        columns: 4,
        sections: [{ name: "Header", components: ["Header"], description: "상단 헤더" }],
      },
    },
  ],
  components: [{ type: "Header", usedIn: ["홈"], notes: "상단 헤더" }],
  responsive: {
    desktop: { breakpoint: "desktop", minWidth: 1024, columns: 12, notes: "전체 그리드" },
    tablet: { breakpoint: "tablet", minWidth: 640, columns: 8, notes: "2열 그리드" },
    mobile: { breakpoint: "mobile", minWidth: 0, columns: 4, notes: "1열 스택" },
  },
};

describe("Wireframe Generator — buildDefaultWireframe()", () => {
  it("produces one ScreenLayout per Storyboard screen description", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    expect(content.layouts.length).toBe(STORYBOARD.content.screenDescriptions.length);
    expect(content.layouts.map((l) => l.screen)).toEqual(
      STORYBOARD.content.screenDescriptions.map((s) => s.screen)
    );
  });

  it("assigns desktop=12/tablet=8/mobile=4 columns to every screen", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    for (const layout of content.layouts) {
      expect(layout.desktop.columns).toBe(12);
      expect(layout.tablet.columns).toBe(8);
      expect(layout.mobile.columns).toBe(4);
    }
  });

  it("derives sections from the screen's keyElements (Header/Footer sections split out)", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const home = content.layouts.find((l) => l.screen === "홈")!;
    const sectionNames = home.desktop.sections.map((s) => s.name);
    expect(sectionNames).toContain("Header");
    expect(sectionNames).toContain("Footer");
  });

  it("falls back to Header/Hero/Footer when keyElements match no known component type", () => {
    const unknownPlanInput: DesignPlanInput = { ...PLAN_INPUT, projectName: "Unknown Components" };
    const unknownPlan: DesignPlanRecord = {
      ...PLAN,
      input: unknownPlanInput,
      content: {
        ...PLAN.content,
        screenList: [
          { name: "홈", path: "/", description: "메인", components: ["MysteryWidget", "AnotherThing"] },
        ],
      },
    };
    const storyboard: StoryboardRecord = { ...STORYBOARD, content: buildDefaultStoryboard(unknownPlan) };

    const content = buildDefaultWireframe(storyboard);
    const sectionComponents = content.layouts[0].desktop.sections.flatMap((s) => s.components);
    expect(sectionComponents).toEqual(expect.arrayContaining(["Header", "Hero", "Footer"]));
  });

  it("builds a global component inventory with usedIn covering every screen that uses it", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    const header = content.components.find((c) => c.type === "Header");
    expect(header).toBeDefined();
    expect(header?.usedIn.length).toBe(STORYBOARD.content.screenDescriptions.length);
  });

  it("returns a fixed desktop/tablet/mobile responsive spec", () => {
    const content = buildDefaultWireframe(STORYBOARD);
    expect(content.responsive.desktop.breakpoint).toBe("desktop");
    expect(content.responsive.tablet.breakpoint).toBe("tablet");
    expect(content.responsive.mobile.breakpoint).toBe("mobile");
    expect(content.responsive.mobile.minWidth).toBe(0);
  });
});

describe("Wireframe Generator — parseWireframeContent()", () => {
  it("parses a well-formed JSON string", () => {
    expect(parseWireframeContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseWireframeContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for invalid JSON", () => {
    expect(parseWireframeContent("not json")).toBeNull();
  });

  it("returns null when a required top-level key is missing (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, responsive: undefined };
    expect(parseWireframeContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a section contains an unknown component type", () => {
    const broken = {
      ...VALID_CONTENT,
      layouts: [
        {
          ...VALID_CONTENT.layouts[0],
          desktop: {
            breakpoint: "desktop",
            columns: 12,
            sections: [{ name: "Header", components: ["NotARealComponent"], description: "x" }],
          },
        },
      ],
    };
    expect(parseWireframeContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when responsive is missing a breakpoint", () => {
    const broken = { ...VALID_CONTENT, responsive: { desktop: VALID_CONTENT.responsive.desktop } };
    expect(parseWireframeContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Wireframe Generator — generateWireframe()", () => {
  it("returns the AI-provided content (simulated:false) when the chat function succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(VALID_CONTENT),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateWireframe(STORYBOARD, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("falls back to buildDefaultWireframe() (simulated:true) when the chat function reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });

    const result = await generateWireframe(STORYBOARD, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultWireframe(STORYBOARD));
  });

  it("falls back to buildDefaultWireframe() (simulated:true) when the chat function returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });

    const result = await generateWireframe(STORYBOARD, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultWireframe(STORYBOARD));
  });
});
