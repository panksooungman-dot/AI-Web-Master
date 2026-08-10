import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { ApiDesignRecord } from "./api-design";
import type { BackendDesignRecord, BackendLogicEndpoint } from "./backend-design";
import type { TestCase, TestPlanRecord } from "./testplan-design";
import type { GeneratedTestFile, TestCodeContent } from "./test-code";

/** 테스트 케이스 배치 크기 — 테스트 본문은 규칙 텍스트보다 부피가 커서 Backend Code와
 *  동일하게 작게 잡는다. */
const BATCH_SIZE = 5;

/**
 * CRITICAL 절 없이 처음 배포했을 때(2026-08-10 실 E2E) 실제로 재현된 문제 — AI가 서비스 함수의
 * 정확한 시그니처를 프롬프트에서 명시적으로 알려주지 않으면 `fn(store, input)`·`fn(store, id,
 * user)`처럼 그럴듯하지만 실제와 다른 호출 규약을 지어내고, `findOne`의 두 번째 인자를 쿼리
 * 객체로 착각하고, seed 테이블 키를 매 테스트마다 다른 대소문자/구분자로 지어냈다 — 생성된
 * 테스트가 구문적으로는 유효한 TypeScript라 파싱 단계에서는 전혀 걸러지지 않고, 실제로 실행하면
 * 전부 타입 오류/런타임 오류로 실패했을 것이다. 아래 CRITICAL 절이 정확한 계약을 못박는다.
 */
const SYSTEM_PROMPT =
  "You are a senior test engineer for AI Business OS's Design Automation system. You are given " +
  "ONE SLICE of a larger project's test plan (natural-language title/steps/expectedResult per " +
  "test case, plus the real service function and table each test targets and its validation/" +
  "business rules) — write the ACTUAL, RUNNABLE Vitest test body for JUST the test cases in this " +
  "slice. Every test must be exactly one `it(\"<title copied verbatim>\", async () => { ... });` " +
  "block (no `describe()` wrapper — the caller adds that). Each case's `kind` field tells you " +
  "which of the two contracts below applies — `\"unit\"` or `\"integration\"`.\n\n" +
  "=== kind: \"unit\" — call the service function directly ===\n" +
  "CRITICAL — exact calling contract, do not deviate: every service function has EXACTLY this " +
  "signature: `functionName(input: Record<string, unknown>, store: ServiceDataStore): " +
  "Promise<unknown>`. Always call it as `await functionName(input, store)` — the input object " +
  "FIRST, the store SECOND, exactly two arguments, never more (to reference an id, put it inside " +
  "the input object as `{ id: \"...\" }`, never as a separate argument). `createFakeStore(seed?)` " +
  "(already in scope, no import needed) returns a fresh ServiceDataStore with EXACTLY these " +
  "methods: `find<T>(table: string, query?: Record<string, unknown>): Promise<T[]>`, " +
  "`findOne<T>(table: string, id: string): Promise<T | null>` (id is a plain STRING, never a " +
  "query object), `insert<T>(table: string, data): Promise<T>`, `update<T>(table: string, id: " +
  "string, data): Promise<T>`, `remove(table: string, id: string): Promise<void>`. Each test " +
  "case's context gives the exact `table` string for that test's resource — use that exact string " +
  "verbatim for `createFakeStore({ [table]: [...] })` seeding and any direct store calls; never " +
  "guess a different casing, pluralization, or separator. Call the named service function " +
  "(already in scope, no import needed) with realistic input matching the test's steps, and " +
  "assert the behavior described in expectedResult using real `expect(...)` assertions (use " +
  "`await expect(promise).rejects.toThrow(...)` for cases expecting an error).\n\n" +
  "=== kind: \"integration\" — call the real Next.js Route Handler, not the service function ===\n" +
  "CRITICAL — exact calling contract, do not deviate: the actual exported Route Handler function " +
  "named `handlerName` is already imported and in scope (do not import it again, do not call the " +
  "service function directly — the whole point of an integration test is to exercise the route's " +
  "auth guard, request parsing, and response shape too). A `testStore` variable (a fresh " +
  "ServiceDataStore from `beforeEach`, same shape as `createFakeStore()` above) is already in " +
  "scope and IS what the handler will read/write — seed it directly, e.g. " +
  "`await testStore.insert(table, { ... })`, before calling the handler.\n" +
  "Build the request with `const request = new Request(\"http://localhost" +
  '${target path, with any :id/{id} replaced by a real seeded id}", { method: "<httpMethod from ' +
  'context>", headers: requiresAuth ? { cookie: "session=test-user" } : {}, ...(body ? { headers: ' +
  '{ ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });`' +
  " — adapt exact header/body construction as needed but always pass a real `Request` instance. " +
  'If `hasIdParam` is true, call the handler as `await handlerName(request, { params: ' +
  'Promise.resolve({ id: "<the seeded id>" }) })`; if false, call it as `await handlerName(request)`. ' +
  "Read the result with `const body = await response.json();` and assert on `response.status` " +
  "and `body` per expectedResult. If `requiresAuth` is true and the test plan's expectedResult " +
  'implies an auth check, you may add a second `it(...)` in the SAME returned "code" string ' +
  "(still valid — multiple `it()` blocks in one `code` string are allowed) that omits the cookie " +
  "header and asserts `response.status` is `401`.\n\n" +
  "In both kinds: do not invent fields beyond what the given spec implies. Other slices of the " +
  "same project are handled by separate calls, so do not reference tests outside this slice. " +
  "Return ONLY a JSON object (no prose, no markdown fences) shaped like: " +
  '{"tests": [{"id": string, "code": string}]} where `id` is copied verbatim from the input so ' +
  "the caller can match it back, and `code` is one or more `it(...)` blocks with no code outside them.";

interface TestCaseContext {
  id: string;
  title: string;
  kind: "unit" | "integration";
  type: string;
  target: string;
  steps: string[];
  expectedResult: string;
  serviceFunction: string | null;
  table: string | null;
  validationRules: string[];
  businessRules: string[];
  errorHandling: string[];
  /** kind:"integration"에서만 채워진다 — Route Handler를 실제로 호출하는 데 필요한 정보. */
  httpMethod: string | null;
  httpPath: string | null;
  handlerName: string | null;
  hasIdParam: boolean;
  requiresAuth: boolean;
}

function buildBatchUserPrompt(contexts: TestCaseContext[]): string {
  return `Test Cases (write test bodies for exactly these ${contexts.length} cases):
${JSON.stringify(contexts)}

Return ONLY a JSON object shaped like:
{ "tests": [{ "id": string, "code": string }] }`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 실제 Vitest 없이도 걸러낼 수 있는 구조적 이상 신호 — `it(` 존재 여부와 중괄호/괄호 균형만
 *  확인한다(토큰 상한에 걸려 잘린 응답의 신호로 특히 유용하다). */
function looksLikeTestCode(code: unknown): code is string {
  if (typeof code !== "string" || code.trim().length === 0) return false;
  if (!code.includes("it(")) return false;
  const braceOpens = (code.match(/\{/g) ?? []).length;
  const braceCloses = (code.match(/\}/g) ?? []).length;
  const parenOpens = (code.match(/\(/g) ?? []).length;
  const parenCloses = (code.match(/\)/g) ?? []).length;
  return braceOpens > 0 && braceOpens === braceCloses && parenOpens === parenCloses;
}

export interface ParsedTestCode {
  id: string;
  code: string;
}

export function parseTestCodeBatch(raw: string): ParsedTestCode[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.tests) || obj.tests.length === 0) return null;

  const tests: ParsedTestCode[] = [];
  for (const item of obj.tests) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (!isNonEmptyString(entry.id)) continue;
    if (!looksLikeTestCode(entry.code)) continue;
    tests.push({ id: entry.id, code: entry.code });
  }

  return tests.length > 0 ? tests : null;
}

function isPathParamSegment(segment: string): boolean {
  return segment.startsWith(":") || (segment.startsWith("{") && segment.endsWith("}"));
}

/** "/api/reservations/:id" → "reservations", "/api/reservations" → "reservations". */
function extractResource(path: string): string {
  const segments = path.split("/").filter((segment) => segment && segment !== "api" && !isPathParamSegment(segment));
  return segments[0] ?? "resource";
}

function toFileSlug(resource: string): string {
  return resource.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || "resource";
}

function integrationTarget(entry: { method: string; path: string }): string {
  return `${entry.method} ${entry.path}`;
}

function hasPathParam(path: string): boolean {
  return path.split("/").some(isPathParamSegment);
}

interface Resolved {
  resource: string;
  serviceFunction: string | null;
  logic: BackendLogicEndpoint | null;
  /** logic이 있고 testCase.type이 "unit"이 아니면 실제 Route Handler를 호출하는 통합 테스트로
   *  취급한다 — target을 단일 엔드포인트로 정확히 매칭하지 못한 경우(주로 e2e)는 안전하게
   *  "unit" 취급으로 폴백한다(서비스 함수가 없어도 기존과 동일하게 동작). */
  kind: "unit" | "integration";
  hasIdParam: boolean;
  requiresAuth: boolean;
  /** api-code-generator.ts가 실제로 export하는 이름과 충돌하지 않도록 이 리소스 안에서 유일하게
   *  붙인 alias. collection/item 레벨 라우트가 같은 리소스 파일에서 동시에 필요할 때만 item 쪽에
   *  "_BY_ID" 접미사를 붙인다(assignHandlerAliases에서 계산). */
  handlerName: string | null;
}

function resolveTestCase(
  testCase: TestCase,
  logicByFunction: Map<string, BackendLogicEndpoint>,
  logicByTarget: Map<string, BackendLogicEndpoint>,
  requiresAuthByTarget: Map<string, boolean>
): Resolved {
  const logic = testCase.type === "unit" ? logicByFunction.get(testCase.target) ?? null : logicByTarget.get(testCase.target) ?? null;
  const kind: "unit" | "integration" = logic && testCase.type !== "unit" ? "integration" : "unit";

  return {
    resource: logic ? toFileSlug(extractResource(logic.path)) : "misc",
    serviceFunction: logic?.serviceFunction ?? null,
    logic,
    kind,
    hasIdParam: logic ? hasPathParam(logic.path) : false,
    requiresAuth: logic ? requiresAuthByTarget.get(integrationTarget(logic)) ?? false : false,
    handlerName: null, // assignHandlerAliases()가 채운다 — 같은 리소스 파일 내 이름 충돌을 알아야 하므로 여기서는 결정할 수 없다.
  };
}

/** 한 리소스의 통합 테스트들이 실제로 필요로 하는 (method, item 레벨 여부) 조합마다 유일한
 *  handlerName을 배정한다. collection/item 레벨 라우트를 모두 import해야 하는 리소스에서만
 *  item 쪽에 "_BY_ID"를 붙여 `import { GET, POST } from ".../route"`와
 *  `import { GET as GET_BY_ID } from ".../[id]/route"`가 같은 파일에서 충돌하지 않게 한다. */
function assignHandlerAliases(resolutions: Map<string, Resolved>): void {
  const byResource = new Map<string, Resolved[]>();
  for (const resolved of resolutions.values()) {
    if (resolved.kind !== "integration" || !resolved.logic) continue;
    const list = byResource.get(resolved.resource) ?? [];
    list.push(resolved);
    byResource.set(resolved.resource, list);
  }

  for (const list of byResource.values()) {
    const needsCollection = list.some((r) => !r.hasIdParam);
    const needsItem = list.some((r) => r.hasIdParam);
    for (const resolved of list) {
      resolved.handlerName =
        resolved.hasIdParam && needsCollection && needsItem ? `${resolved.logic!.method}_BY_ID` : resolved.logic!.method;
    }
  }
}

function buildDefaultTestCaseCode(testCase: TestCase): string {
  const lines = [
    `it(${JSON.stringify(testCase.title)}, async () => {`,
    "  // TODO: AI 미사용/실패로 실제 검증 로직이 생성되지 않았습니다 — 수동 구현이 필요합니다.",
    `  // Target: ${testCase.target}`,
    ...testCase.steps.map((step) => `  // Step: ${step}`),
    `  // Expected: ${testCase.expectedResult}`,
    "  expect(true).toBe(true); // placeholder — replace with real assertions",
    "});",
  ];
  return lines.join("\n");
}

function indent(code: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => (line.length > 0 ? pad + line : line))
    .join("\n");
}

const FAKE_STORE_FILE_PATH = "lib/services/__tests__/fakeStore.ts";

function buildFakeStoreFile(): GeneratedTestFile {
  return {
    path: FAKE_STORE_FILE_PATH,
    code: `import type { ServiceDataStore } from "../types";

/** In-memory ServiceDataStore fake for generated tests only — never use in production. */
export function createFakeStore(seed: Record<string, unknown[]> = {}): ServiceDataStore {
  const tables = new Map<string, Record<string, unknown>[]>(
    Object.entries(seed).map(([key, value]) => [key, value as Record<string, unknown>[]])
  );
  let nextId = 1;

  function getTable(name: string): Record<string, unknown>[] {
    const existing = tables.get(name);
    if (existing) return existing;
    const created: Record<string, unknown>[] = [];
    tables.set(name, created);
    return created;
  }

  return {
    async find<T = unknown>(table: string, query: Record<string, unknown> = {}): Promise<T[]> {
      const rows = getTable(table);
      const entries = Object.entries(query);
      return rows.filter((row) => entries.every(([key, value]) => row[key] === value)) as T[];
    },
    async findOne<T = unknown>(table: string, id: string): Promise<T | null> {
      const rows = getTable(table);
      const found = rows.find((row) => row.id === id);
      return (found as T | undefined) ?? null;
    },
    async insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<T> {
      const rows = getTable(table);
      const record: Record<string, unknown> = { id: String(nextId++), ...data };
      rows.push(record);
      return record as T;
    },
    async update<T = unknown>(table: string, id: string, data: Record<string, unknown>): Promise<T> {
      const rows = getTable(table);
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) throw new Error(\`레코드를 찾을 수 없습니다: \${table}/\${id}\`);
      rows[index] = { ...rows[index], ...data };
      return rows[index] as T;
    },
    async remove(table: string, id: string): Promise<void> {
      const rows = getTable(table);
      const index = rows.findIndex((row) => row.id === id);
      if (index !== -1) rows.splice(index, 1);
    },
  };
}
`,
  };
}

export interface GenerateTestCodeResult {
  content: TestCodeContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

interface BatchOutcome {
  codeById: Map<string, string>;
  usedFallback: boolean;
  provider?: string;
  model?: string;
}

async function generateBatch(
  testCases: TestCase[],
  contexts: TestCaseContext[],
  chatFn: ChatFn
): Promise<BatchOutcome> {
  const result = await chatFn(buildBatchUserPrompt(contexts), { system: SYSTEM_PROMPT });
  const codeById = new Map<string, string>();

  if (result.success && result.content) {
    const parsed = parseTestCodeBatch(result.content);
    if (parsed) {
      for (const test of parsed) codeById.set(test.id, test.code);
    }
  }

  let usedFallback = false;
  for (const testCase of testCases) {
    if (!codeById.has(testCase.id)) {
      usedFallback = true;
      codeById.set(testCase.id, buildDefaultTestCaseCode(testCase));
    }
  }

  return {
    codeById,
    usedFallback,
    provider: result.success ? result.provider : undefined,
    model: result.success ? result.model : undefined,
  };
}

function buildLookups(backend: BackendDesignRecord, api: ApiDesignRecord) {
  const logicByFunction = new Map<string, BackendLogicEndpoint>();
  const logicByTarget = new Map<string, BackendLogicEndpoint>();
  for (const entry of backend.content.logic) {
    logicByFunction.set(entry.serviceFunction, entry);
    logicByTarget.set(integrationTarget(entry), entry);
  }

  const requiresAuthByTarget = new Map<string, boolean>();
  for (const endpoint of api.content.endpoints) {
    requiresAuthByTarget.set(integrationTarget(endpoint), endpoint.requiresAuth);
  }

  return { logicByFunction, logicByTarget, requiresAuthByTarget };
}

function buildContext(testCase: TestCase, resolved: Resolved): TestCaseContext {
  return {
    id: testCase.id,
    title: testCase.title,
    kind: resolved.kind,
    type: testCase.type,
    target: testCase.target,
    steps: testCase.steps,
    expectedResult: testCase.expectedResult,
    serviceFunction: resolved.serviceFunction,
    table: resolved.logic ? extractResource(resolved.logic.path) : null,
    validationRules: resolved.logic?.validationRules ?? [],
    businessRules: resolved.logic?.businessRules ?? [],
    errorHandling: resolved.logic?.errorHandling ?? [],
    httpMethod: resolved.kind === "integration" ? resolved.logic!.method : null,
    httpPath: resolved.kind === "integration" ? resolved.logic!.path : null,
    handlerName: resolved.kind === "integration" ? resolved.handlerName : null,
    hasIdParam: resolved.hasIdParam,
    requiresAuth: resolved.requiresAuth,
  };
}

/** lib/services/__tests__/{resource}.test.ts에서 app/api/{resource}/route(.ts 생략)로 가는 상대
 *  경로 — api-code-generator.ts가 실제로 파일을 쓰는 위치(app/api/<resource>/[[id]/]route.ts)와
 *  정확히 일치해야 import가 실제로 그 파일을 가리킨다. */
function routeImportPath(resource: string, hasId: boolean): string {
  return hasId ? `../../../app/api/${resource}/[id]/route` : `../../../app/api/${resource}/route`;
}

function buildIntegrationTestFile(resource: string, entries: Resolved[], blocks: string[]): GeneratedTestFile {
  const collectionImports = new Set<string>();
  const itemImports = new Set<string>();

  for (const entry of entries) {
    const alias = entry.handlerName!;
    const importSpec = alias === entry.logic!.method ? entry.logic!.method : `${entry.logic!.method} as ${alias}`;
    (entry.hasIdParam ? itemImports : collectionImports).add(importSpec);
  }

  const imports =
    (collectionImports.size > 0 ? `import { ${Array.from(collectionImports).join(", ")} } from "${routeImportPath(resource, false)}";\n` : "") +
    (itemImports.size > 0 ? `import { ${Array.from(itemImports).join(", ")} } from "${routeImportPath(resource, true)}";\n` : "");

  const header =
    `import { beforeEach, describe, expect, it, vi } from "vitest";\n` +
    `import { createFakeStore } from "./fakeStore";\n\n` +
    `vi.mock("../store", () => ({ getServiceStore: vi.fn() }));\n` +
    `import { getServiceStore } from "../store";\n\n` +
    `${imports}\n`;

  const body =
    `describe(${JSON.stringify(`${resource} (integration)`)}, () => {\n` +
    `  let testStore: ReturnType<typeof createFakeStore>;\n\n` +
    `  beforeEach(() => {\n` +
    `    testStore = createFakeStore();\n` +
    `    vi.mocked(getServiceStore).mockReturnValue(testStore);\n` +
    `  });\n\n` +
    `${blocks.map((block) => indent(block, 2)).join("\n\n")}\n});\n`;

  return { path: `lib/services/__tests__/${resource}.integration.test.ts`, code: header + body };
}

function assembleFiles(
  testCases: TestCase[],
  resolutions: Map<string, Resolved>,
  codeById: Map<string, string>
): GeneratedTestFile[] {
  const byResourceUnit = new Map<string, { imports: Set<string>; blocks: string[] }>();
  const byResourceIntegration = new Map<string, { entries: Resolved[]; blocks: string[] }>();

  for (const testCase of testCases) {
    const resolved = resolutions.get(testCase.id)!;
    const code = codeById.get(testCase.id) ?? buildDefaultTestCaseCode(testCase);

    if (resolved.kind === "integration" && resolved.logic) {
      const group = byResourceIntegration.get(resolved.resource) ?? { entries: [], blocks: [] };
      group.entries.push(resolved);
      group.blocks.push(code);
      byResourceIntegration.set(resolved.resource, group);
      continue;
    }

    const group = byResourceUnit.get(resolved.resource) ?? { imports: new Set<string>(), blocks: [] };
    if (resolved.serviceFunction) group.imports.add(resolved.serviceFunction);
    group.blocks.push(code);
    byResourceUnit.set(resolved.resource, group);
  }

  const testFiles: GeneratedTestFile[] = Array.from(byResourceUnit.entries()).map(([resource, group]) => {
    const importLine = group.imports.size > 0 ? `import { ${Array.from(group.imports).join(", ")} } from "../${resource}";\n` : "";
    const header = `import { describe, expect, it } from "vitest";\n${importLine}import { createFakeStore } from "./fakeStore";\n\n`;
    const body = `describe(${JSON.stringify(resource)}, () => {\n${group.blocks.map((block) => indent(block, 2)).join("\n\n")}\n});\n`;

    return { path: `lib/services/__tests__/${resource}.test.ts`, code: header + body };
  });

  const integrationFiles: GeneratedTestFile[] = Array.from(byResourceIntegration.entries()).map(([resource, group]) =>
    buildIntegrationTestFile(resource, group.entries, group.blocks)
  );
  testFiles.push(...integrationFiles);

  return [buildFakeStoreFile(), ...testFiles];
}

const FULLY_DEFAULT_NOTES = "AI Provider 미설정으로 모든 테스트가 placeholder(TODO)로 생성되었습니다 — 실제 배포 전 수동으로 구현하세요.";
const PARTIALLY_DEFAULT_NOTES = "일부 테스트는 AI 응답 실패로 placeholder(TODO)로 생성되었습니다 — 수동 검토가 필요합니다.";
const FULLY_AI_NOTES = "모든 테스트가 AI로 생성되었습니다. 실제 배포 전 어서션을 검토하세요.";

/** 생성된 테스트가 "vitest"를 import하는데, Website Builder가 스캐폴딩하는 프로젝트의
 *  package.json에는 vitest가 없다(Next.js 템플릿에는 테스트 러너가 기본 포함되지 않음) — 그
 *  상태로는 `npm test`조차 실행할 수 없다. website-fullstack-adapter.ts가 이 값을 실제
 *  package.json에 병합한다. */
const TEST_PACKAGE_REQUIREMENTS = {
  devDependencies: { vitest: "^3.2.7" },
  scripts: { test: "vitest run" },
};

/**
 * Test Plan만으로 항상 유효한(컴파일·실행 가능한) Test Code를 만드는 결정론적 폴백 —
 * Provider 미설정이거나 응답 파싱에 실패해도 빈 테스트가 되지 않는다(buildDefaultTestCaseCode() 참고).
 */
export function buildDefaultTestCode(testPlan: TestPlanRecord, backend: BackendDesignRecord, api: ApiDesignRecord): TestCodeContent {
  const { logicByFunction, logicByTarget, requiresAuthByTarget } = buildLookups(backend, api);
  const resolutions = new Map<string, Resolved>();
  const codeById = new Map<string, string>();

  for (const testCase of testPlan.content.testCases) {
    resolutions.set(testCase.id, resolveTestCase(testCase, logicByFunction, logicByTarget, requiresAuthByTarget));
    codeById.set(testCase.id, buildDefaultTestCaseCode(testCase));
  }
  assignHandlerAliases(resolutions);

  return {
    files: assembleFiles(testPlan.content.testCases, resolutions, codeById),
    notes: FULLY_DEFAULT_NOTES,
    packageRequirements: TEST_PACKAGE_REQUIREMENTS,
  };
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 placeholder 폴백 — Test Plan의 테스트
 * 케이스를 BATCH_SIZE 단위로 나눈 배치마다 독립적으로 이뤄진다(병렬 실행). `chatFn`은 기본값이
 * 실제 lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI
 * 서브프로세스 없이 검증한다.
 */
export async function generateTestCode(
  testPlan: TestPlanRecord,
  backend: BackendDesignRecord,
  api: ApiDesignRecord,
  chatFn: ChatFn = chatViaCli
): Promise<GenerateTestCodeResult> {
  const { logicByFunction, logicByTarget, requiresAuthByTarget } = buildLookups(backend, api);
  const resolutions = new Map<string, Resolved>();

  for (const testCase of testPlan.content.testCases) {
    resolutions.set(testCase.id, resolveTestCase(testCase, logicByFunction, logicByTarget, requiresAuthByTarget));
  }
  assignHandlerAliases(resolutions);

  const contexts = new Map<string, TestCaseContext>();
  for (const testCase of testPlan.content.testCases) {
    contexts.set(testCase.id, buildContext(testCase, resolutions.get(testCase.id)!));
  }

  const batches: TestCase[][] = [];
  for (let i = 0; i < testPlan.content.testCases.length; i += BATCH_SIZE) {
    batches.push(testPlan.content.testCases.slice(i, i + BATCH_SIZE));
  }

  const outcomes = await Promise.all(
    batches.map((batch) => generateBatch(batch, batch.map((tc) => contexts.get(tc.id)!), chatFn))
  );

  const codeById = new Map<string, string>();
  for (const outcome of outcomes) {
    for (const [id, code] of outcome.codeById) codeById.set(id, code);
  }

  const simulated = outcomes.some((o) => o.usedFallback);
  const firstSuccess = outcomes.find((o) => !o.usedFallback && o.provider);
  const notes = !simulated ? FULLY_AI_NOTES : firstSuccess ? PARTIALLY_DEFAULT_NOTES : FULLY_DEFAULT_NOTES;

  return {
    content: {
      files: assembleFiles(testPlan.content.testCases, resolutions, codeById),
      notes,
      packageRequirements: TEST_PACKAGE_REQUIREMENTS,
    },
    simulated,
    provider: firstSuccess?.provider,
    model: firstSuccess?.model,
  };
}
