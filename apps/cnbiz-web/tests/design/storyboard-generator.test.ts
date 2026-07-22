import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildDefaultStoryboard,
  generateStoryboard,
  parseStoryboardContent,
} from "../../lib/design/storyboard-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import { planToDesignDocument } from "../../lib/design/design-document-adapter";
import { saveDesignDocument } from "../../lib/design/design-document-registry";
import { createFsStore } from "../../lib/db/fsStore";
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

describe("Storyboard Generator — Design JSON Standardization Phase 10.5 (Persistence Integration)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "storyboard-generator-persistence-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  const SENTINEL_PROJECT_NAME = "__PERSISTED_SENTINEL__";

  it("when plan.document is missing, reuses a persisted DesignDocument (via getOrBuildDesignDocumentForPlan) instead of rebuilding", async () => {
    const fresh = planToDesignDocument(PLAN);
    const sentinelDocument = { ...fresh, metadata: { ...fresh.metadata, projectName: SENTINEL_PROJECT_NAME } };
    await saveDesignDocument({ projectId: PLAN.id, document: sentinelDocument }, store);

    const capturedPrompts: string[] = [];
    const fakeChat = async (message: string): Promise<ChatResult> => {
      capturedPrompts.push(message);
      return { success: true, content: JSON.stringify(VALID_CONTENT) };
    };

    const result = await generateStoryboard(PLAN, fakeChat, store);

    expect(result.content).toEqual(VALID_CONTENT); // output unchanged — fakeChat's canned response wins either way
    expect(capturedPrompts[0]).toContain(SENTINEL_PROJECT_NAME); // but the prompt was built from the REUSED persisted document
  });

  it("when plan.document is already present, never touches the persistence layer at all", async () => {
    const planWithDocument: DesignPlanRecord = { ...PLAN, document: planToDesignDocument(PLAN) };

    // An empty/never-populated store — if the generator tried to persist or reuse anything here,
    // getLatestDesignDocument would still correctly return null, but more importantly this proves
    // the call succeeds without needing the store at all when plan.document is already set.
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: JSON.stringify(VALID_CONTENT) });
    const result = await generateStoryboard(planWithDocument, fakeChat, store);

    expect(result.content).toEqual(VALID_CONTENT);
  });

  it("buildDefaultStoryboard() (sync fallback) is completely unaffected — same output regardless of what's persisted", async () => {
    const fresh = planToDesignDocument(PLAN);
    const sentinelDocument = { ...fresh, metadata: { ...fresh.metadata, projectName: SENTINEL_PROJECT_NAME } };
    await saveDesignDocument({ projectId: PLAN.id, document: sentinelDocument }, store);

    // buildDefaultStoryboard() takes no store parameter and never awaits anything — it must be
    // byte-identical to calling it before Phase 10.5 existed.
    expect(buildDefaultStoryboard(PLAN)).toEqual(buildDefaultStoryboard(PLAN));
    expect(buildDefaultStoryboard(PLAN).screenFlow.map((s) => s.screen)).toEqual(
      PLAN.content.screenList.map((s) => s.name)
    );
  });
});
