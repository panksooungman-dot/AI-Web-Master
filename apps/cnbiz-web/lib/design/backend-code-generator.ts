import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { BackendDesignRecord, BackendLogicEndpoint } from "./backend-design";
import type { BackendCodeContent, GeneratedServiceFile } from "./backend-code";

/**
 * 한 번의 chatFn 호출로 처리할 서비스 함수 개수. 코드 본문은 규칙 텍스트보다 부피가 커서
 * Backend Design의 배치 크기(10)보다 작게 잡는다 — 동일한 이유(2026-08-10 실 E2E에서 재현된
 * 큰 응답의 토큰 상한 초과)로 backend-design-generator.ts/testplan-design-generator.ts와 같은
 * 배치 병렬 호출 패턴을 그대로 재사용한다.
 */
export const BACKEND_CODE_BATCH_SIZE = 5;
const BATCH_SIZE = BACKEND_CODE_BATCH_SIZE;

/** 모든 생성 함수가 공유하는 데이터 접근 계약 — 특정 DB 벤더에 종속되지 않도록 이 인터페이스
 *  하나만 통해 데이터에 접근한다. 배포 시 이 인터페이스를 실제 DB 클라이언트로 구현하면 된다. */
const SERVICE_DATA_STORE_INTERFACE = `export interface ServiceDataStore {
  find<T = unknown>(table: string, query?: Record<string, unknown>): Promise<T[]>;
  findOne<T = unknown>(table: string, id: string): Promise<T | null>;
  insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<T>;
  update<T = unknown>(table: string, id: string, data: Record<string, unknown>): Promise<T>;
  remove(table: string, id: string): Promise<void>;
}`;

const TYPES_FILE_PATH = "lib/services/types.ts";

const SYSTEM_PROMPT =
  "You are a senior TypeScript backend engineer for AI Business OS's Design Automation system. " +
  "You are given ONE SLICE of a larger project's backend service logic specification (natural-" +
  "language validation rules, business rules, and error handling per service function) — write " +
  "the ACTUAL, COMPILABLE TypeScript implementation for JUST the functions in this slice. Every " +
  "function must have exactly this signature: `export async function <serviceFunction>(input: " +
  "Record<string, unknown>, store: ServiceDataStore): Promise<unknown>`, where ServiceDataStore " +
  "is already declared elsewhere and in scope (do not redeclare it, do not import it):\n\n" +
  SERVICE_DATA_STORE_INTERFACE +
  "\n\nReal-implement the given validationRules and businessRules as actual `if` checks that " +
  '`throw new Error("...")` with a message describing the violated rule (in the same language as ' +
  "the rule), and use store.find/findOne/insert/update/remove (with the endpoint's resource name, " +
  "taken from its path) to perform the described data operation — implement errorHandling too " +
  "(e.g. a 404-shaped rule should throw when store.findOne returns null). Do not invent fields, " +
  "tables, or endpoints beyond what the given logic implies. Other slices of the same project are " +
  "handled by separate calls, so do not reference functions outside this slice. Return ONLY a " +
  'JSON object (no prose, no markdown fences) shaped like: {"functions": [{"serviceFunction": ' +
  'string, "code": string}]} where `code` is the complete function (starting with `export async ' +
  "function`), with no import statements and no code outside the function body.";

function buildBatchUserPrompt(logic: BackendLogicEndpoint[]): string {
  return `Backend Logic Specifications (write implementations for exactly these ${logic.length} functions):
${JSON.stringify(logic)}

Return ONLY a JSON object shaped like:
{ "functions": [{ "serviceFunction": string, "code": string }] }`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 실제 TS 컴파일러 없이도 걸러낼 수 있는 구조적 이상 신호 — 함수명 포함 여부와 중괄호 균형만
 *  확인한다(토큰 상한에 걸려 코드가 중간에 잘린 경우 이 균형이 깨지므로 특히 유용하다). */
function looksLikeFunctionCode(code: unknown, serviceFunction: string): code is string {
  if (typeof code !== "string" || code.trim().length === 0) return false;
  if (!code.includes(`function ${serviceFunction}`)) return false;
  const opens = (code.match(/\{/g) ?? []).length;
  const closes = (code.match(/\}/g) ?? []).length;
  return opens > 0 && opens === closes;
}

export interface ParsedFunctionCode {
  serviceFunction: string;
  code: string;
}

/**
 * AI 응답(배치 하나 분량)을 함수별 코드 목록으로 파싱한다. 하나라도 구조적으로 이상하면(중괄호
 * 불균형 등) 그 함수 하나만 제외하고 나머지는 그대로 사용한다 — 배치 전체를 버리지 않는다,
 * 이후 gap-fill이 빠진 함수만 개별 폴백하기 때문이다.
 */
export function parseBackendCodeBatch(raw: string): ParsedFunctionCode[] | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.functions) || obj.functions.length === 0) return null;

  const functions: ParsedFunctionCode[] = [];
  for (const item of obj.functions) {
    if (typeof item !== "object" || item === null) continue;
    const entry = item as Record<string, unknown>;
    if (!isNonEmptyString(entry.serviceFunction)) continue;
    if (!looksLikeFunctionCode(entry.code, entry.serviceFunction)) continue;
    functions.push({ serviceFunction: entry.serviceFunction, code: entry.code });
  }

  return functions.length > 0 ? functions : null;
}

function isPathParamSegment(segment: string): boolean {
  return segment.startsWith(":") || (segment.startsWith("{") && segment.endsWith("}"));
}

/** "/api/reservations/:id" → "reservations", "/api/reservations" → "reservations". */
export function extractResource(path: string): string {
  const segments = path.split("/").filter((segment) => segment && segment !== "api" && !isPathParamSegment(segment));
  return segments[0] ?? "resource";
}

function toFileSlug(resource: string): string {
  return resource.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || "resource";
}

/** 경로 파라미터 존재 여부 — ":id"(Express류)와 "{id}"(OpenAPI류) 두 표기 모두 인식한다(API
 *  Design 생성기가 특정 표기를 강제하지 않아 AI가 어느 쪽이든 선택할 수 있음 — 2026-08-10 실
 *  E2E에서 "{id}" 표기가 실제로 관측됨). */
function hasPathParam(path: string): boolean {
  return path.split("/").some(isPathParamSegment);
}

/**
 * 서비스 함수 하나에 대한 결정론적 기본 구현 — 실제로 컴파일·실행 가능한 CRUD 코드다(단, AI가
 * 해석한 자연어 규칙만큼 정교하지 않다). Provider 미설정/파싱 실패 시 폴백에서도, 배치 단위
 * 응답에서 특정 함수 하나만 누락됐을 때의 부분 보강(gap-fill)에서도 재사용된다.
 */
export function buildDefaultFunctionCode(entry: BackendLogicEndpoint): string {
  const resource = extractResource(entry.path);
  const hasIdParam = hasPathParam(entry.path);

  const ruleLines = [
    entry.validationRules.length > 0 ? `Validation: ${entry.validationRules.join(" / ")}` : null,
    entry.businessRules.length > 0 ? `Business: ${entry.businessRules.join(" / ")}` : null,
    entry.errorHandling.length > 0 ? `Error handling: ${entry.errorHandling.join(" / ")}` : null,
  ].filter((line): line is string => line !== null);

  const doc = [
    "/**",
    " * AI Provider 미설정/응답 실패로 자동 생성된 기본 구현입니다.",
    " * 아래 규칙은 코드로 구현되지 않았으므로 수동 검토가 필요합니다.",
    ...ruleLines.map((line) => ` * - ${line}`),
    " */",
  ].join("\n");

  let body: string;
  switch (entry.method) {
    case "GET":
      body = hasIdParam
        ? `const record = await store.findOne("${resource}", String(input.id));\n  if (!record) throw new Error("대상을 찾을 수 없습니다.");\n  return record;`
        : `return store.find("${resource}", input);`;
      break;
    case "POST":
      body = `return store.insert("${resource}", input);`;
      break;
    case "PUT":
    case "PATCH":
      body = `return store.update("${resource}", String(input.id), input);`;
      break;
    case "DELETE":
      body = `await store.remove("${resource}", String(input.id));\n  return { success: true };`;
      break;
    default:
      body = `throw new Error("지원하지 않는 메서드입니다: ${entry.method}");`;
  }

  return `${doc}\nexport async function ${entry.serviceFunction}(input: Record<string, unknown>, store: ServiceDataStore): Promise<unknown> {\n  ${body}\n}`;
}

function buildTypesFile(): GeneratedServiceFile {
  return { path: TYPES_FILE_PATH, code: `${SERVICE_DATA_STORE_INTERFACE}\n` };
}

function assembleFiles(logic: BackendLogicEndpoint[], codeByFunction: Map<string, string>): GeneratedServiceFile[] {
  const byResource = new Map<string, string[]>();

  for (const entry of logic) {
    const resource = toFileSlug(extractResource(entry.path));
    const code = codeByFunction.get(entry.serviceFunction) ?? buildDefaultFunctionCode(entry);
    const functions = byResource.get(resource) ?? [];
    functions.push(code);
    byResource.set(resource, functions);
  }

  const resourceFiles: GeneratedServiceFile[] = Array.from(byResource.entries()).map(([resource, functions]) => ({
    path: `lib/services/${resource}.ts`,
    code: `import type { ServiceDataStore } from "./types";\n\n${functions.join("\n\n")}\n`,
  }));

  return [buildTypesFile(), ...resourceFiles];
}

const FULLY_DEFAULT_NOTES = "AI Provider 미설정으로 생성된 기본 CRUD 구현입니다. 실제 배포 전 비즈니스 규칙을 수동으로 구현하세요.";
const PARTIALLY_DEFAULT_NOTES = "일부 함수는 AI 응답 실패로 기본 CRUD 구현(TODO 주석 포함)으로 생성되었습니다 — 수동 검토가 필요합니다.";
const FULLY_AI_NOTES = "모든 함수가 AI로 생성되었습니다. 실제 배포 전 로직을 검토하세요.";

/**
 * Backend Design만으로 항상 유효한(컴파일 가능한) Backend Code를 만드는 결정론적 폴백 —
 * Provider 미설정이거나 응답 파싱에 실패해도 빈 코드가 되지 않는다(buildDefaultFunctionCode() 참고).
 * `generateBackendCode()`의 모든 배치가 폴백된 경우(AI가 단 하나도 성공하지 못한 경우)와 동일한
 * `notes` 문구를 사용해, "모든 배치 실패 시 이 함수의 결과와 완전히 동일하다"는 불변식을 유지한다.
 */
export function buildDefaultBackendCode(backend: BackendDesignRecord): BackendCodeContent {
  return {
    files: assembleFiles(backend.content.logic, new Map()),
    notes: FULLY_DEFAULT_NOTES,
  };
}

export interface GenerateBackendCodeResult {
  content: BackendCodeContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

interface BatchOutcome {
  codeByFunction: Map<string, string>;
  usedFallback: boolean;
  provider?: string;
  model?: string;
}

/**
 * 서비스 함수 배치 하나를 처리한다 — AI 응답이 없거나 파싱에 실패하면 배치 전체를, 파싱에는
 * 성공했지만 특정 함수 하나가 응답에서 누락되거나 구조적으로 이상하면(중괄호 불균형 등) 그
 * 함수 하나만 결정론적 기본 구현으로 폴백한다(gap-fill).
 */
async function generateBatch(logic: BackendLogicEndpoint[], chatFn: ChatFn): Promise<BatchOutcome> {
  const result = await chatFn(buildBatchUserPrompt(logic), { system: SYSTEM_PROMPT });
  const codeByFunction = new Map<string, string>();

  if (result.success && result.content) {
    const parsed = parseBackendCodeBatch(result.content);
    if (parsed) {
      for (const fn of parsed) {
        codeByFunction.set(fn.serviceFunction, fn.code);
      }
    }
  }

  let usedFallback = false;
  for (const entry of logic) {
    if (!codeByFunction.has(entry.serviceFunction)) {
      usedFallback = true;
      codeByFunction.set(entry.serviceFunction, buildDefaultFunctionCode(entry));
    }
  }

  return {
    codeByFunction,
    usedFallback,
    provider: result.success ? result.provider : undefined,
    model: result.success ? result.model : undefined,
  };
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본 구현 폴백 — Backend Design의 로직
 * 항목을 BATCH_SIZE 단위로 나눈 배치마다 독립적으로 이뤄진다(병렬 실행). `chatFn`은 기본값이
 * 실제 lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI
 * 서브프로세스 없이 검증한다.
 */
export async function generateBackendCode(
  backend: BackendDesignRecord,
  chatFn: ChatFn = chatViaCli
): Promise<GenerateBackendCodeResult> {
  const batches: BackendLogicEndpoint[][] = [];
  for (let i = 0; i < backend.content.logic.length; i += BATCH_SIZE) {
    batches.push(backend.content.logic.slice(i, i + BATCH_SIZE));
  }

  const outcomes = await Promise.all(batches.map((batch) => generateBatch(batch, chatFn)));

  const codeByFunction = new Map<string, string>();
  for (const outcome of outcomes) {
    for (const [serviceFunction, code] of outcome.codeByFunction) {
      codeByFunction.set(serviceFunction, code);
    }
  }

  const simulated = outcomes.some((o) => o.usedFallback);
  const firstSuccess = outcomes.find((o) => !o.usedFallback && o.provider);

  const notes = !simulated ? FULLY_AI_NOTES : firstSuccess ? PARTIALLY_DEFAULT_NOTES : FULLY_DEFAULT_NOTES;

  return {
    content: {
      files: assembleFiles(backend.content.logic, codeByFunction),
      notes,
    },
    simulated,
    provider: firstSuccess?.provider,
    model: firstSuccess?.model,
  };
}
