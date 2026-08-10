import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  buildDefaultTestCode,
  generateTestCode,
  parseTestCodeBatch,
} from "../../lib/design/test-code-generator";
import { buildDefaultTestPlan } from "../../lib/design/testplan-design-generator";
import { buildDefaultBackendDesign } from "../../lib/design/backend-design-generator";
import { buildDefaultApiDesign } from "../../lib/design/api-design-generator";
import { buildDefaultDatabaseDesign } from "../../lib/design/database-design-generator";
import { buildDefaultDesignPlan } from "../../lib/design/generator";
import type { ApiDesignRecord } from "../../lib/design/api-design";
import type { BackendDesignRecord } from "../../lib/design/backend-design";
import type { DatabaseDesignRecord } from "../../lib/design/database-design";
import type { TestCase, TestPlanRecord } from "../../lib/design/testplan-design";
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

// 20 logic entries -> 40 test cases (unit+integration per entry, see testplan-design-generator
// tests) / BATCH_SIZE=5 -> 8 batches, deliberately chosen to exercise multi-batch behavior.
const BACKEND_DESIGN: BackendDesignRecord = {
  id: "backend-design-1",
  apiDesignId: API_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultBackendDesign(API_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

const TEST_PLAN: TestPlanRecord = {
  id: "test-plan-1",
  backendDesignId: BACKEND_DESIGN.id,
  planId: PLAN.id,
  version: 1,
  content: buildDefaultTestPlan(BACKEND_DESIGN),
  simulated: true,
  createdAt: new Date().toISOString(),
};

function fakeCodeFor(testCase: TestCase): string {
  return `it(${JSON.stringify(testCase.title)}, async () => {
  const store = createFakeStore();
  expect(store).toBeDefined(); // AI가 생성한 검증
});`;
}

/** Always returns valid code for every test case in TEST_PLAN, regardless of which batch asked —
 *  the per-id lookup only needs its own entries' ids present, so a superset is harmless. */
function buildFullAiContent() {
  return {
    tests: TEST_PLAN.content.testCases.map((tc) => ({ id: tc.id, code: fakeCodeFor(tc) })),
  };
}

function assertValidTypeScript(source: string) {
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  expect(errors.map((e) => ts.flattenDiagnosticMessageText(e.messageText, "\n"))).toEqual([]);
}

describe("Test Code Generator — parseTestCodeBatch()", () => {
  const VALID_PAYLOAD = {
    tests: [{ id: "TC-001", code: 'it("검증", async () => {\n  expect(true).toBe(true);\n});' }],
  };

  it("parses a valid JSON payload", () => {
    expect(parseTestCodeBatch(JSON.stringify(VALID_PAYLOAD))).toEqual(VALID_PAYLOAD.tests);
  });

  it("strips a ```json code fence before parsing", () => {
    const fenced = "```json\n" + JSON.stringify(VALID_PAYLOAD) + "\n```";
    expect(parseTestCodeBatch(fenced)).toEqual(VALID_PAYLOAD.tests);
  });

  it("returns null for unparseable JSON", () => {
    expect(parseTestCodeBatch("not json")).toBeNull();
  });

  it("returns null when tests is empty", () => {
    expect(parseTestCodeBatch(JSON.stringify({ tests: [] }))).toBeNull();
  });

  it("drops a test whose code has unbalanced braces (truncated-response signal)", () => {
    const truncated = { tests: [{ id: "TC-001", code: 'it("x", async () => {\n  expect(true' }] };
    expect(parseTestCodeBatch(JSON.stringify(truncated))).toBeNull();
  });

  it("drops a test whose code doesn't contain an it(...) block", () => {
    const noItBlock = { tests: [{ id: "TC-001", code: "const x = 1;" }] };
    expect(parseTestCodeBatch(JSON.stringify(noItBlock))).toBeNull();
  });
});

describe("Test Code Generator — buildDefaultTestCode()", () => {
  it("always includes the shared fakeStore.ts file plus at least one resource test file", () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    expect(content.files.some((f) => f.path === "lib/services/__tests__/fakeStore.ts")).toBe(true);
    expect(content.files.some((f) => f.path.startsWith("lib/services/__tests__/") && f.path.endsWith(".test.ts") && f.path !== "lib/services/__tests__/fakeStore.ts")).toBe(true);
  });

  it("every test case's title appears as an it(...) block somewhere in the output", () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    const allCode = content.files.map((f) => f.code).join("\n");
    for (const testCase of TEST_PLAN.content.testCases) {
      expect(allCode).toContain(JSON.stringify(testCase.title));
    }
  });

  it("every generated file is valid, compilable TypeScript", () => {
    const content = buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN);
    for (const file of content.files) {
      assertValidTypeScript(file.code);
    }
  });
});

describe("Test Code Generator — generateTestCode() batching", () => {
  it("splits 40 test cases into exactly 8 batch calls (BATCH_SIZE=5)", async () => {
    let callCount = 0;
    const fakeChat = async (): Promise<ChatResult> => {
      callCount++;
      return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
    };

    await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);

    expect(callCount).toBe(8);
  });

  it("uses AI-provided code (simulated:false) when every batch succeeds with valid JSON", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);

    expect(result.simulated).toBe(false);
    expect(result.provider).toBe("anthropic");
    const allCode = result.content.files.map((f) => f.code).join("\n");
    expect(allCode).toContain("AI가 생성한 검증");
    for (const file of result.content.files) assertValidTypeScript(file.code);
  });

  it("falls back entirely (simulated:true) when every batch's chat call reports failure, matching buildDefaultTestCode()", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: false, error: "no provider" });
    const result = await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    expect(result.content).toEqual(buildDefaultTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN));
  });

  it("falls back entirely (simulated:true) when every batch returns unparseable content", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({ success: true, content: "not json at all" });
    const result = await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);
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

    const result = await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);

    expect(callCount).toBe(8);
    expect(result.simulated).toBe(true);
    expect(result.provider).toBe("anthropic");
    const allCode = result.content.files.map((f) => f.code).join("\n");
    expect(allCode).toContain("AI가 생성한 검증");
    expect(allCode).toContain("AI 미사용/실패로 실제 검증 로직이 생성되지 않았습니다");
    for (const file of result.content.files) assertValidTypeScript(file.code);
  });

  it("gap-fills a single test case whose batch response omits it", async () => {
    const omittedCase = TEST_PLAN.content.testCases[0];
    const fakeChat = async (): Promise<ChatResult> => {
      const content = buildFullAiContent();
      content.tests = content.tests.filter((t) => t.id !== omittedCase.id);
      return { success: true, content: JSON.stringify(content), provider: "anthropic", model: "claude-sonnet-5" };
    };

    const result = await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);

    expect(result.simulated).toBe(true);
    const allCode = result.content.files.map((f) => f.code).join("\n");
    expect(allCode).toContain(JSON.stringify(omittedCase.title));
    expect(allCode).toContain("AI 미사용/실패로 실제 검증 로직이 생성되지 않았습니다");
    for (const file of result.content.files) assertValidTypeScript(file.code);
  });

  it("resource test files import the real service function(s) their test cases target", async () => {
    const fakeChat = async (): Promise<ChatResult> => ({
      success: true,
      content: JSON.stringify(buildFullAiContent()),
      provider: "anthropic",
      model: "claude-sonnet-5",
    });

    const result = await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);
    // integration test files import the Route Handler (GET/POST/...), not the service function —
    // only unit test files (plain "{resource}.test.ts") are relevant to this assertion.
    const resourceFiles = result.content.files.filter(
      (f) => f.path !== "lib/services/__tests__/fakeStore.ts" && !f.path.endsWith(".integration.test.ts")
    );

    // every resource file with an import line must reference at least one real serviceFunction name
    const knownServiceFunctions = new Set(BACKEND_DESIGN.content.logic.map((l) => l.serviceFunction));
    for (const file of resourceFiles) {
      const importMatch = file.code.match(/import \{ ([^}]+) \} from "\.\.\/(.+)";/);
      if (!importMatch) continue;
      const importedNames = importMatch[1].split(",").map((s) => s.trim());
      for (const name of importedNames) {
        expect(knownServiceFunctions.has(name)).toBe(true);
      }
    }
  });

  // Regression: a real E2E (2026-08-10) showed the AI inventing a plausible-but-wrong calling
  // convention (fn(store, input), findOne(table, {id}) instead of findOne(table, id), and
  // inconsistent table-name casing across tests) because the prompt never stated the exact
  // signature or the exact table string to use. Both are now explicit in the prompt/context.
  it("tells the model the exact (input, store) calling contract and the resolved table name per test case", async () => {
    const capturedMessages: string[] = [];
    let capturedSystem = "";
    const fakeChat = async (message: string, options?: { system?: string }): Promise<ChatResult> => {
      capturedMessages.push(message);
      capturedSystem = options?.system ?? "";
      return { success: true, content: JSON.stringify(buildFullAiContent()), provider: "anthropic", model: "claude-sonnet-5" };
    };

    await generateTestCode(TEST_PLAN, BACKEND_DESIGN, API_DESIGN, fakeChat);

    expect(capturedSystem).toContain("functionName(input, store)");
    expect(capturedSystem).toContain("findOne<T>(table: string, id: string)");

    const combined = capturedMessages.join("\n");
    // every logic entry's resource (the table string) must appear as context somewhere in a batch prompt
    for (const entry of BACKEND_DESIGN.content.logic) {
      const resource = entry.path.split("/").filter((s) => s && s !== "api" && !s.startsWith(":"))[0];
      expect(combined).toContain(resource);
    }
  });
});
