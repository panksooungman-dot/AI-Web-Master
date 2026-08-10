import { describe, expect, it } from "vitest";
import {
  buildDefaultBackendDesign,
  buildDefaultLogicEntry,
  generateBackendDesign,
  parseBackendDesignContent,
} from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord, ApiEndpoint } from "../../lib/design/api-design";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
import type { BackendLogicEndpoint } from "../../lib/design/backend-design";
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

// buildDefaultDesignPlan() has 4 features -> 4 resource tables -> 20 CRUD endpoints (5 per table),
// which is exactly 2 batches at BATCH_SIZE=10 — deliberately chosen to exercise multi-batch behavior
// without a hand-built fixture.
const API_DESIGN: ApiDesignRecord = {
  id: "api-design-1",
  databaseDesignId: DATABASE_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultApiDesign(DATABASE_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

function fakeLogicFor(endpoint: ApiEndpoint): BackendLogicEndpoint {
  return {
    method: endpoint.method,
    path: endpoint.path,
    serviceFunction: `ai_${endpoint.method}_${endpoint.path.replace(/\W+/g, "_")}`,
    validationRules: ["AI가 생성한 검증 규칙"],
    businessRules: ["AI가 생성한 비즈니스 규칙"],
    errorHandling: ["AI가 생성한 에러 처리"],
  };
}

/** Always returns a full valid response covering every endpoint in API_DESIGN, regardless of which
 *  batch asked — the per-batch lookup only needs its own endpoints' keys present, so a superset is
 *  harmless and this avoids having to parse the batch's endpoint slice back out of the prompt text. */
function buildFullAiContent() {
  return {
    logic: API_DESIGN.content.endpoints.map(fakeLogicFor),
    sharedServices: ["AuthService"],
    backgroundJobs: [],
    implementationNotes: "AI가 생성한 구현 노트",
  };
}

const VALID_CONTENT = {
  logic: [
    {
      method: "POST",
      path: "/api/reservations",
      serviceFunction: "createReservation",
      validationRules: ["patient_name은 필수다."],
      businessRules: ["동일 시간대에 중복 예약을 허용하지 않는다."],
      errorHandling: ["검증 실패 시 400을 반환한다."],
    },
  ],
  sharedServices: ["AuthService"],
  backgroundJobs: [],
  implementationNotes: "예약 생성 전 시간대 충돌을 먼저 검사한다.",
};

describe("Backend Design Generator — parseBackendDesignContent()", () => {
  it("parses a valid JSON payload", () => {
    expect(parseBackendDesignContent(JSON.stringify(VALID_CONTENT))).toEqual(VALID_CONTENT);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_CONTENT) + "\n```";
    expect(parseBackendDesignContent(fenced)).toEqual(VALID_CONTENT);
  });

  it("returns null for unparseable JSON", () => {
    expect(parseBackendDesignContent("not json")).toBeNull();
  });

  it("returns null when logic is empty", () => {
    const broken = { ...VALID_CONTENT, logic: [] };
    expect(parseBackendDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when a logic entry has an empty validationRules array (all-or-nothing validation)", () => {
    const broken = { ...VALID_CONTENT, logic: [{ ...VALID_CONTENT.logic[0], validationRules: [] }] };
    expect(parseBackendDesignContent(JSON.stringify(broken))).toBeNull();
  });

  it("returns null when sharedServices isn't a string array", () => {
    const broken = { ...VALID_CONTENT, sharedServices: "AuthService" };
    expect(parseBackendDesignContent(JSON.stringify(broken))).toBeNull();
  });
});

describe("Backend Design Generator — buildDefaultLogicEntry() / buildDefaultBackendDesign()", () => {
  it("generates exactly one logic entry per endpoint", () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    expect(content.logic.length).toBe(API_DESIGN.content.endpoints.length);
  });

  it("every logic entry has non-empty validation/business/error rule arrays", () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    for (const entry of content.logic) {
      expect(entry.validationRules.length).toBeGreaterThan(0);
      expect(entry.businessRules.length).toBeGreaterThan(0);
      expect(entry.errorHandling.length).toBeGreaterThan(0);
      expect(entry.serviceFunction).toBeTruthy();
    }
  });

  it("derives distinct camelCase service function names per method (create/list/get/update/delete)", () => {
    const content = buildDefaultBackendDesign(API_DESIGN);
    const names = content.logic.map((l) => l.serviceFunction);
    expect(names.some((n) => n.startsWith("create"))).toBe(true);
    expect(names.some((n) => n.startsWith("list"))).toBe(true);
    expect(names.some((n) => n.startsWith("update"))).toBe(true);
    expect(names.some((n) => n.startsWith("delete"))).toBe(true);
  });

  it("buildDefaultLogicEntry() matches buildDefaultBackendDesign()'s per-endpoint output", () => {
    const endpoint = API_DESIGN.content.endpoints[0];
    expect(buildDefaultLogicEntry(endpoint)).toEqual(buildDefaultBackendDesign(API_DESIGN).logic[0]);
  });

  // Regression: API Design's system prompt doesn't mandate a path-param syntax, and a real E2E
  // (2026-08-10) showed the AI choosing OpenAPI-style "{id}" instead of Express-style ":id" — the
  // original hasIdParam check only recognized ":id", so a single-item GET was misnamed
  // "listReservations" instead of "getReservationById", and its errorHandling never mentioned 404.
  it("detects an OpenAPI-style '{id}' path param exactly like ':id' (getXById naming + 404 handling)", () => {
    const endpoint: ApiEndpoint = {
      method: "GET",
      path: "/api/reservations/{id}",
      description: "단건 조회",
      requiresAuth: false,
      requestBody: "",
      responseShape: "reservation",
    };
    const entry = buildDefaultLogicEntry(endpoint);
    expect(entry.serviceFunction).toBe("getReservationById");
    expect(entry.errorHandling).toContain("대상을 찾을 수 없으면 404를 반환한다.");
  });
});

describe("Backend Design Generator — generateBackendDesign() batching", () => {
  it("splits a 20-endpoint API Design into exactly 2 batch calls (BATCH_SIZE=10)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
    };

    await generateBackendDesign(API_DESIGN, fakeChat);

    expect(callCount).toBe(2);
  });

  it("uses AI-provided content (simulated:false) when every batch succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateBackendDesign(API_DESIGN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    expect(result.content.logic.length).toBe(API_DESIGN.content.endpoints.length);
    expect(result.content.logic.every((entry) => entry.serviceFunction.startsWith("ai_"))).toBe(true);
  });

  it("falls back entirely (simulated:true) when every batch's chat call reports failure", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateBackendDesign(API_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultBackendDesign(API_DESIGN));
  });

  it("falls back entirely (simulated:true) when every batch returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateBackendDesign(API_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
  });

  it("falls back only for the failing batch, keeping the successful batch's AI content (partial fallback)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      if (callCount === 1) {
        return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
      }
      return { success: false, error: "simulated batch failure" };
    };

    const result = await generateBackendDesign(API_DESIGN, fakeChat);

    expect(callCount).toBe(2);
    expect(result.simulated).toBe(true); // at least one batch fell back
    expect(result.provider).toBe("anthropic"); // still reports the successful batch's provider
    expect(result.content.logic.length).toBe(API_DESIGN.content.endpoints.length);
    // some entries came from the AI (batch 1), some from the deterministic fallback (batch 2)
    expect(result.content.logic.some((entry) => entry.serviceFunction.startsWith("ai_"))).toBe(true);
    const defaultServiceFunctions = new Set(buildDefaultBackendDesign(API_DESIGN).logic.map((l) => l.serviceFunction));
    expect(result.content.logic.some((entry) => defaultServiceFunctions.has(entry.serviceFunction))).toBe(true);
  });

  it("gap-fills a single missing endpoint within an otherwise-valid batch response", async () => {
    const omittedEndpoint = API_DESIGN.content.endpoints[0];
    const fakeChat = async (): Promise<ChatResult> => {
      const content = buildFullAiContent();
      content.logic = content.logic.filter(
        (entry) => !(entry.method === omittedEndpoint.method && entry.path === omittedEndpoint.path)
      );
      return { success: true, content: JSON.stringify(content), provider: "anthropic", model: "claude-sonnet-5" };
    };

    const result = await generateBackendDesign(API_DESIGN, fakeChat);

    expect(result.simulated).toBe(true); // the gap triggered a fallback for that one endpoint
    expect(result.content.logic.length).toBe(API_DESIGN.content.endpoints.length);
    const filled = result.content.logic.find(
      (entry) => entry.method === omittedEndpoint.method && entry.path === omittedEndpoint.path
    );
    expect(filled).toEqual(buildDefaultLogicEntry(omittedEndpoint));
  });
});
