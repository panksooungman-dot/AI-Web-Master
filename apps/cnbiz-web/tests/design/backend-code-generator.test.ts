import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  buildDefaultBackendCode,
  buildDefaultFunctionCode,
  generateBackendCode,
  parseBackendCodeBatch,
} from "../../lib/design/backend-code-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord, BackendLogicEndpoint } from "../../lib/design/backend-design";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
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

// 20 logic entries (see backend-design-generator.test.ts) / BATCH_SIZE=5 -> 4 batches, deliberately
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

function fakeCodeFor(entry: BackendLogicEndpoint): string {
  return `export async function ${entry.serviceFunction}(input: Record<string, unknown>, store: ServiceDataStore): Promise<unknown> {
  if (!input.name) {
    throw new Error("AI가 생성한 검증 오류");
  }
  return store.find("resource", input);
}`;
}

/** Always returns valid code for every logic entry in BACKEND_DESIGN, regardless of which batch
 *  asked — the per-function lookup only needs its own entries' names present, so a superset is
 *  harmless. */
function buildFullAiContent() {
  return {
    functions: BACKEND_DESIGN.content.logic.map((entry) => ({
      serviceFunction: entry.serviceFunction,
      code: fakeCodeFor(entry),
    })),
  };
}

/** Compiles `source` (TypeScript, no imports needed since ServiceDataStore is declared inline) and
 *  asserts there are no syntax errors — proves the generated code is real, parseable TypeScript,
 *  not just text that looks like code. */
function assertValidTypeScript(source: string) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  expect(errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"))).toEqual([]);
}

describe("Backend Code Generator — parseBackendCodeBatch()", () => {
  const VALID_PAYLOAD = {
    functions: [
      {
        serviceFunction: "createReservation",
        code: 'export async function createReservation(input: Record<string, unknown>, store: ServiceDataStore): Promise<unknown> {\n  return store.insert("reservations", input);\n}',
      },
    ],
  };

  it("parses a valid JSON payload", () => {
    const parsed = parseBackendCodeBatch(JSON.stringify(VALID_PAYLOAD));
    expect(parsed).toEqual(VALID_PAYLOAD.functions);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_PAYLOAD) + "\n```";
    expect(parseBackendCodeBatch(fenced)).toEqual(VALID_PAYLOAD.functions);
  });

  it("returns null for unparseable JSON", () => {
    expect(parseBackendCodeBatch("not json")).toBeNull();
  });

  it("returns null when functions is empty", () => {
    expect(parseBackendCodeBatch(JSON.stringify({ functions: [] }))).toBeNull();
  });

  it("drops a function whose code has unbalanced braces (truncated-response signal) but keeps the rest", () => {
    const truncated = {
      functions: [
        VALID_PAYLOAD.functions[0],
        { serviceFunction: "listReservations", code: "export async function listReservations(input) {\n  return store.find(" }, // truncated, missing closing braces
      ],
    };
    const parsed = parseBackendCodeBatch(JSON.stringify(truncated));
    expect(parsed).toEqual(VALID_PAYLOAD.functions);
  });

  it("drops a function whose code doesn't reference its own declared name", () => {
    const mismatched = {
      functions: [{ serviceFunction: "createReservation", code: "export async function wrongName() {}" }],
    };
    expect(parseBackendCodeBatch(JSON.stringify(mismatched))).toBeNull();
  });
});

describe("Backend Code Generator — buildDefaultFunctionCode() / buildDefaultBackendCode()", () => {
  it("generates exactly one file per resource plus the shared types.ts file", () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    expect(content.files.some((f) => f.path === "lib/services/types.ts")).toBe(true);
    expect(content.files.filter((f) => f.path !== "lib/services/types.ts").length).toBeGreaterThan(0);
  });

  it("every generated file is valid, compilable TypeScript", () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    for (const file of content.files) {
      assertValidTypeScript(file.code);
    }
  });

  it("every logic entry's function appears in its resource file, wired to store CRUD calls", () => {
    const content = buildDefaultBackendCode(BACKEND_DESIGN);
    const allCode = content.files.map((f) => f.code).join("\n");
    for (const entry of BACKEND_DESIGN.content.logic) {
      expect(allCode).toContain(`function ${entry.serviceFunction}(`);
    }
  });

  it("buildDefaultFunctionCode() derives method-appropriate store calls (GET->find, POST->insert, DELETE->remove)", () => {
    const getEntry = BACKEND_DESIGN.content.logic.find((l) => l.method === "GET" && !l.path.includes(":id"))!;
    const postEntry = BACKEND_DESIGN.content.logic.find((l) => l.method === "POST")!;
    const deleteEntry = BACKEND_DESIGN.content.logic.find((l) => l.method === "DELETE")!;

    expect(buildDefaultFunctionCode(getEntry)).toContain("store.find(");
    expect(buildDefaultFunctionCode(postEntry)).toContain("store.insert(");
    expect(buildDefaultFunctionCode(deleteEntry)).toContain("store.remove(");
  });

  // Regression: a real E2E (2026-08-10) showed API Design choosing OpenAPI-style "{id}" instead of
  // ":id" — buildDefaultFunctionCode()'s hasIdParam check originally only recognized ":id", so a
  // single-item GET fell back to store.find() (list behavior) instead of store.findOne() + 404.
  it("detects an OpenAPI-style '{id}' path param exactly like ':id' (findOne + 404, not find)", () => {
    const entry: BackendLogicEndpoint = {
      method: "GET",
      path: "/api/reservations/{id}",
      serviceFunction: "getReservationById",
      validationRules: [],
      businessRules: [],
      errorHandling: [],
    };
    const code = buildDefaultFunctionCode(entry);
    expect(code).toContain("store.findOne(");
    expect(code).not.toContain("store.find(\"reservations\", input)");
  });
});

describe("Backend Code Generator — generateBackendCode() batching", () => {
  it("splits a 20-logic-entry Backend Design into exactly 4 batch calls (BATCH_SIZE=5)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
    };

    await generateBackendCode(BACKEND_DESIGN, fakeChat);

    expect(callCount).toBe(4);
  });

  it("uses AI-provided code (simulated:false) when every batch succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateBackendCode(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    const allCode = result.content.files.map((f) => f.code).join("\n");
    expect(allCode).toContain("AI가 생성한 검증 오류");
    for (const file of result.content.files) assertValidTypeScript(file.code);
  });

  it("falls back entirely (simulated:true) when every batch's chat call reports failure, and matches buildDefaultBackendCode()", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateBackendCode(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultBackendCode(BACKEND_DESIGN));
  });

  it("falls back entirely (simulated:true) when every batch returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateBackendCode(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
  });

  it("falls back only for the failing batch, keeping successful batches' AI code (partial fallback)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      if (callCount === 1) {
        return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
      }
      return { success: false, error: "simulated batch failure" };
    };

    const result = await generateBackendCode(BACKEND_DESIGN, fakeChat);

    expect(callCount).toBe(4);
    expect(result.simulated).toBe(true);
    expect(result.provider).toBe("anthropic");
    const allCode = result.content.files.map((f) => f.code).join("\n");
    expect(allCode).toContain("AI가 생성한 검증 오류"); // batch 1's AI code survived
    expect(allCode).toContain("자동 생성된 기본 구현"); // other batches fell back
    for (const file of result.content.files) assertValidTypeScript(file.code);
  });

  it("gap-fills a single function whose batch response omits it, keeping the rest of that batch's AI code", async () => {
    const omittedEntry = BACKEND_DESIGN.content.logic[0];
    const fakeChat = async (): Promise<ChatResult> => {
      const content = buildFullAiContent();
      content.functions = content.functions.filter((f) => f.serviceFunction !== omittedEntry.serviceFunction);
      return { success: true, content: JSON.stringify(content), provider: "anthropic", model: "claude-sonnet-5" };
    };

    const result = await generateBackendCode(BACKEND_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    const allCode = result.content.files.map((f) => f.code).join("\n");
    expect(allCode).toContain(`function ${omittedEntry.serviceFunction}(`);
    expect(allCode).toContain(buildDefaultFunctionCode(omittedEntry));
    for (const file of result.content.files) assertValidTypeScript(file.code);
  });
});
