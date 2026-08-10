import { describe, expect, it } from "vitest";
import {
  buildDefaultTestPlan,
  generateTestPlan,
  parseTestPlanContent,
} from "../../lib/design/testplan-design-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord, BackendLogicEndpoint } from "../../lib/design/backend-design";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
import type { TestCase } from "../../lib/design/testplan-design";
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

const DATABASE_DESIGN: DatabaseDesignRecord = {
  id: "database-design-1",
  planId: PLAN.id,
  version: 1,
  content: buildDefaultDatabaseDesign(PLAN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const API_DESIGN: ApiDesignRecord = {
  id: "api-design-1",
  databaseDesignId: DATABASE_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultApiDesign(DATABASE_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

// 20 logic entries (see backend-design-generator.test.ts) / BATCH_SIZE=8 -> 3 batches, deliberately
// chosen to exercise multi-batch behavior without a hand-built fixture.
const BACKEND_DESIGN: BackendDesignRecord = {
  id: "backend-design-1",
  apiDesignId: API_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultBackendDesign(API_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

function fakeCasesFor(entry: BackendLogicEndpoint): TestCase[] {
  return [
    {
      id: "TC-AI",
      title: `AI unit test for ${entry.serviceFunction}`,
      type: "unit",
      target: entry.serviceFunction,
      steps: ["AI가 생성한 단계"],
      expectedResult: "AI가 생성한 기대 결과",
    },
    {
      id: "TC-AI",
      title: `AI integration test for ${entry.method} ${entry.path}`,
      type: "integration",
      target: `${entry.method} ${entry.path}`,
      steps: ["AI가 생성한 단계"],
      expectedResult: "AI가 생성한 기대 결과",
    },
  ];
}

/** Always returns a full valid response covering every logic entry in BACKEND_DESIGN, regardless of
 *  which batch asked — the per-entry lookup only needs its own entries' targets present, so a
 *  superset is harmless. */
function buildFullAiContent() {
  return {
    testCases: BACKEND_DESIGN.content.logic.flatMap(fakeCasesFor),
    coverageSummary: "AI가 생성한 커버리지 요약",
    priorityNotes: "AI가 생성한 우선순위 노트",
  };
}

const VALID_CONTENT = {
  testCases: [
    {
      id: "TC-001",
      title: "예약 생성 필수값 검증",
      type: "unit",
      target: "createReservation",
      steps: ["patient_name 없이 호출한다.", "결과를 확인한다."],
      expectedResult: "검증 오류로 거부된다.",
    },
    {
      id: "TC-002",
      title: "POST /api/reservations 계약 확인",
      type: "integration",
      target: "POST /api/reservations",
      steps: ["유효한 요청을 보낸다.", "응답을 확인한다."],
      expectedResult: "201과 생성된 예약을 반환한다.",
    },
  ],
  coverageSummary: "예약 생성 로직의 unit/integration 테스트를 포함한다.",
  priorityNotes: "예약 생성부터 우선 테스트한다.",
};

describe("Test Plan Generator — parseTestPlanContent()", () => {
  it("parses a valid JSON payload", () => {
    expect(parseTestPlanContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseTestPlanContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for unparseable JSON", () => {
    expect(parseTestPlanContent("not json")).toBeNull();
  });

  it("returns null when a test case type isn't one of the allowed values", () => {
    const broken = { ...VALID_CONTENT, testCases: [{ ...VALID_CONTENT.testCases[0], type: "manual" }] };
    expect(parseTestPlanContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when testCases is empty", () => {
    const broken = { ...VALID_CONTENT, testCases: [] };
    expect(parseTestPlanContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a test case has an empty steps array (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, testCases: [{ ...VALID_CONTENT.testCases[0], steps: [] }] };
    expect(parseTestPlanContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Test Plan Generator — buildDefaultTestPlan()", () => {
  it("generates exactly one unit + one integration test case per backend logic entry", () => {
    const content = buildDefaultTestPlan(BACKEND_DESIGN);
    expect(content.testCases.length).toBe(BACKEND_DESIGN.content.logic.length * 2);
    expect(content.testCases.filter((tc) => tc.type === "unit").length).toBe(BACKEND_DESIGN.content.logic.length);
    expect(content.testCases.filter((tc) => tc.type === "integration").length).toBe(BACKEND_DESIGN.content.logic.length);
  });

  it("every test case has a unique sequential id, non-empty steps, and an expected result", () => {
    const content = buildDefaultTestPlan(BACKEND_DESIGN);
    expect(content.testCases.map((tc) => tc.id)).toEqual(
      content.testCases.map((_, i) => `TC-${String(i + 1).padStart(3, "0")}`)
    );
    for (const testCase of content.testCases) {
      expect(testCase.steps.length).toBeGreaterThan(0);
      expect(testCase.expectedResult).toBeTruthy();
    }
  });
});

describe("Test Plan Generator — generateTestPlan() batching", () => {
  it("splits a 20-logic-entry Backend Design into exactly 3 batch calls (BATCH_SIZE=8)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
    };

    await generateTestPlan(BACKEND_DESIGN, fakeChat);

    expect(callCount).toBe(3);
  });

  it("uses AI-provided content (simulated:false) when every batch succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateTestPlan(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content.testCases.length).toBe(BACKEND_DESIGN.content.logic.length * 2);
    expect(result.content.testCases.every((tc) => tc.title.startsWith("AI "))).toBe(true);
  });

  it("renumbers ids sequentially across batches even though every fake AI response reuses the same id", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateTestPlan(BACKEND_DESIGN, fakeChat);

    const ids = result.content.testCases.map((tc) => tc.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(ids.map((_, i) => `TC-${String(i + 1).padStart(3, "0")}`));
  });

  it("falls back entirely (simulated:true) when every batch's chat call reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateTestPlan(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultTestPlan(BACKEND_DESIGN));
  });

  it("falls back entirely (simulated:true) when every batch returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateTestPlan(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
  });

  it("falls back only for the failing batch, keeping successful batches' AI content (partial fallback)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      if (callCount === 1) {
        return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
      }
      return { success: false, error: "simulated batch failure" };
    };

    const result = await generateTestPlan(BACKEND_DESIGN, fakeChat);

    expect(callCount).toBe(3);
    expect(result.simulated).toBe(true);
    expect(result.provider).toBe("anthropic");
    expect(result.content.testCases.length).toBe(BACKEND_DESIGN.content.logic.length * 2);
    expect(result.content.testCases.some((tc) => tc.title.startsWith("AI "))).toBe(true);
    const defaultTitles = new Set(buildDefaultTestPlan(BACKEND_DESIGN).testCases.map((tc) => tc.title));
    expect(result.content.testCases.some((tc) => defaultTitles.has(tc.title))).toBe(true);
  });

  it("gap-fills a logic entry whose batch response is missing its integration case", async () => {
    const targetEntry = BACKEND_DESIGN.content.logic[0];
    const fakeChat = async (): Promise<ChatResult> => {
      const content = buildFullAiContent();
      content.testCases = content.testCases.filter(
        (tc) => !(tc.type === "integration" && tc.target === `${targetEntry.method} ${targetEntry.path}`)
      );
      return { success: true, content: JSON.stringify(content), provider: "anthropic", model: "claude-sonnet-5" };
    };

    const result = await generateTestPlan(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content.testCases.length).toBe(BACKEND_DESIGN.content.logic.length * 2);

    const defaultPairTitles = new Set(
      buildDefaultTestPlan({ ...BACKEND_DESIGN, content: { ...BACKEND_DESIGN.content, logic: [targetEntry] } }).testCases.map(
        (tc) => tc.title
      )
    );
    // the gap-filled entry's unit+integration titles should match the deterministic default, not the AI title
    const relatedCases = result.content.testCases.filter(
      (tc) => tc.target === targetEntry.serviceFunction || tc.target === `${targetEntry.method} ${targetEntry.path}`
    );
    expect(relatedCases.length).toBe(2);
    expect(relatedCases.every((tc) => defaultPairTitles.has(tc.title))).toBe(true);
  });
});
