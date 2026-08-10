import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { ApiDesignRecord, ApiEndpoint } from "./api-design";
import type { BackendDesignContent, BackendLogicEndpoint } from "./backend-design";

/**
 * 한 번의 chatFn 호출로 처리할 엔드포인트 개수. 큰 API Design(엔드포인트 수십 개)을 한 번에
 * 요청하면 응답이 모델의 출력 토큰 상한을 넘겨 JSON이 중간에 잘려 파싱에 실패하고, 결국 전체가
 * 결정론적 폴백으로 떨어진다(2026-08-10 실 E2E 검증에서 63개 엔드포인트로 재현·확인). 엔드포인트를
 * 이 크기로 나눠 병렬 호출하면 각 응답이 항상 작게 유지되어 실패 확률이 낮아지고, 설령 일부
 * 배치가 실패해도 그 배치의 엔드포인트만 폴백되어 전체가 폴백되지 않는다.
 */
export const BACKEND_DESIGN_BATCH_SIZE = 10;
const BATCH_SIZE = BACKEND_DESIGN_BATCH_SIZE;

const SYSTEM_PROMPT =
  "You are a senior backend engineer for AI Business OS's Design Automation system. You are given " +
  "ONE SLICE of a larger project's REST API design (a subset of its endpoints) and its overall " +
  "authentication strategy — design the backend service logic for JUST the endpoints in this " +
  "slice. Produce a single JSON object (no prose, no markdown fences) with exactly these keys: " +
  "logic, sharedServices, backgroundJobs, implementationNotes. `logic` must have exactly one entry " +
  "per endpoint given, with the same `method`/`path` values, plus a camelCase `serviceFunction` " +
  "name, and non-empty `validationRules`/`businessRules`/`errorHandling` arrays. `sharedServices` " +
  "lists reusable service modules THIS slice's endpoints depend on (e.g. AuthService) — another " +
  "call covers other slices, so only list what's relevant here. `backgroundJobs` lists any " +
  "async/scheduled work this slice implies (empty array if none). Other slices of the same project " +
  "are handled by separate calls and merged by the caller, so do not reference endpoints outside " +
  "this slice.";

function buildBatchUserPrompt(endpoints: ApiEndpoint[]): string {
  return `Endpoints (design backend logic for exactly these ${endpoints.length} endpoints):
${JSON.stringify(endpoints)}

Return ONLY a JSON object shaped like:
{
  "logic": [{
    "method": string, "path": string, "serviceFunction": string,
    "validationRules": string[], "businessRules": string[], "errorHandling": string[]
  }],
  "sharedServices": string[],
  "backgroundJobs": string[],
  "implementationNotes": string (한국어 1~2문장, 이 슬라이스 구현 시 주의할 점)
}`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1] : trimmed;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return isStringArray(value) && value.length > 0;
}

function isBackendLogicEndpoint(value: unknown): value is BackendLogicEndpoint {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    isNonEmptyString(entry.method) &&
    isNonEmptyString(entry.path) &&
    isNonEmptyString(entry.serviceFunction) &&
    isNonEmptyStringArray(entry.validationRules) &&
    isNonEmptyStringArray(entry.businessRules) &&
    isNonEmptyStringArray(entry.errorHandling)
  );
}

/**
 * AI 응답(배치 하나 분량)을 BackendDesignContent로 파싱한다. 하나라도 어긋나면 null을 반환해
 * 호출자가 그 배치 전체를 결정론적 기본값으로 폴백하도록 한다(all-or-nothing 원칙은 배치 단위로
 * 적용됨 — 전체 Backend Design 단위가 아니다).
 */
export function parseBackendDesignContent(raw: string): BackendDesignContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.logic) || obj.logic.length === 0 || !obj.logic.every(isBackendLogicEndpoint)) return null;
  if (!isStringArray(obj.sharedServices)) return null;
  if (!isStringArray(obj.backgroundJobs)) return null;
  if (!isNonEmptyString(obj.implementationNotes)) return null;

  return {
    logic: obj.logic,
    sharedServices: obj.sharedServices,
    backgroundJobs: obj.backgroundJobs,
    implementationNotes: obj.implementationNotes,
  };
}

function pascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9가-힣]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function singularize(resource: string): string {
  return resource.endsWith("s") && resource.length > 1 ? resource.slice(0, -1) : resource;
}

function isPathParamSegment(segment: string): boolean {
  return segment.startsWith(":") || (segment.startsWith("{") && segment.endsWith("}"));
}

/** "/api/reservations/:id" → "reservations", "/api/reservations" → "reservations". */
function extractResource(path: string): string {
  const segments = path.split("/").filter((segment) => segment && segment !== "api" && !isPathParamSegment(segment));
  return segments[0] ?? "resource";
}

/** 경로 파라미터 존재 여부 — ":id"(Express류)와 "{id}"(OpenAPI류) 두 표기 모두 인식한다. API
 *  Design 생성기의 시스템 프롬프트가 특정 표기를 강제하지 않아, 실제 AI 응답이 어느 쪽을 쓸지는
 *  실행 전까지 알 수 없다(2026-08-10 실 E2E에서 "{id}" 표기가 실제로 관측됨). */
function hasPathParam(path: string): boolean {
  return path.split("/").some(isPathParamSegment);
}

function deriveServiceFunction(endpoint: ApiEndpoint): string {
  const resource = extractResource(endpoint.path);
  const hasIdParam = hasPathParam(endpoint.path);
  const singular = pascalCase(singularize(resource));
  const plural = pascalCase(resource);

  switch (endpoint.method) {
    case "GET":
      return hasIdParam ? `get${singular}ById` : `list${plural}`;
    case "POST":
      return `create${singular}`;
    case "PUT":
    case "PATCH":
      return `update${singular}`;
    case "DELETE":
      return `delete${singular}`;
    default:
      return `handle${singular}`;
  }
}

/**
 * 엔드포인트 하나에 대한 결정론적 기본 로직 항목 — Provider 미설정/파싱 실패 시 폴백에서도,
 * 배치 단위 응답에서 특정 엔드포인트 하나만 누락됐을 때의 부분 보강(gap-fill)에서도 재사용된다.
 */
export function buildDefaultLogicEntry(endpoint: ApiEndpoint): BackendLogicEndpoint {
  const serviceFunction = deriveServiceFunction(endpoint);
  const resource = extractResource(endpoint.path);

  const validationRules: string[] =
    endpoint.method === "POST" || endpoint.method === "PUT" || endpoint.method === "PATCH"
      ? [`요청 본문(${endpoint.requestBody || resource})의 필수 필드를 검증한다.`]
      : [`경로 파라미터가 유효한 형식인지 검증한다.`];

  const businessRules: string[] = [
    endpoint.requiresAuth
      ? `인증된 사용자만 이 작업을 수행할 수 있다.`
      : `인증 없이 호출 가능하지만 응답 데이터는 공개 가능한 범위로 제한한다.`,
  ];

  const errorHandling: string[] = [
    "요청 검증 실패 시 400과 필드별 오류 메시지를 반환한다.",
    hasPathParam(endpoint.path) ? "대상을 찾을 수 없으면 404를 반환한다." : "예기치 못한 오류는 500으로 처리하고 로그를 남긴다.",
  ];

  return { method: endpoint.method, path: endpoint.path, serviceFunction, validationRules, businessRules, errorHandling };
}

/**
 * API Design만으로 항상 유효한 Backend Design을 만드는 결정론적 폴백 — Provider 미설정이거나
 * 응답 파싱에 실패해도 빈 로직이 되지 않는다. 각 엔드포인트에 이름·검증/비즈니스/에러 규칙을
 * method 기준 규칙으로 대응시키는 단순한 규칙(buildDefaultLogicEntry 참고).
 */
export function buildDefaultBackendDesign(api: ApiDesignRecord): BackendDesignContent {
  return {
    logic: api.content.endpoints.map(buildDefaultLogicEntry),
    sharedServices: api.content.authenticationStrategy ? ["AuthService"] : [],
    backgroundJobs: [],
    implementationNotes: "AI Provider 미설정으로 생성된 기본값입니다. 실제 구현 전 비즈니스 규칙을 재검토하세요.",
  };
}

export interface GenerateBackendDesignResult {
  content: BackendDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

function endpointKey(method: string, path: string): string {
  return `${method} ${path}`;
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items));
}

interface BatchOutcome {
  logic: BackendLogicEndpoint[];
  sharedServices: string[];
  backgroundJobs: string[];
  implementationNotes: string | null;
  usedFallback: boolean;
  provider?: string;
  model?: string;
}

/**
 * 엔드포인트 배치 하나를 처리한다 — AI 응답이 없거나 파싱에 실패하면 배치 전체를 폴백하고,
 * 파싱에는 성공했지만 특정 엔드포인트의 로직이 응답에서 누락된 경우 그 엔드포인트만 개별
 * 폴백한다(gap-fill). 두 경우 모두 `usedFallback:true`로 보고해 호출자가 최종 `simulated`
 * 플래그를 계산할 수 있게 한다.
 */
async function generateBatch(endpoints: ApiEndpoint[], chatFn: ChatFn): Promise<BatchOutcome> {
  const result = await chatFn(buildBatchUserPrompt(endpoints), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseBackendDesignContent(result.content);
    if (parsed) {
      const byKey = new Map(parsed.logic.map((entry) => [endpointKey(entry.method, entry.path), entry]));
      let usedFallback = false;

      const logic = endpoints.map((endpoint) => {
        const existing = byKey.get(endpointKey(endpoint.method, endpoint.path));
        if (existing) return existing;
        usedFallback = true;
        return buildDefaultLogicEntry(endpoint);
      });

      return {
        logic,
        sharedServices: parsed.sharedServices,
        backgroundJobs: parsed.backgroundJobs,
        implementationNotes: parsed.implementationNotes,
        usedFallback,
        provider: result.provider,
        model: result.model,
      };
    }
  }

  return {
    logic: endpoints.map(buildDefaultLogicEntry),
    sharedServices: [],
    backgroundJobs: [],
    implementationNotes: null,
    usedFallback: true,
  };
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백 — 단, 이제 이 all-or-nothing
 * 판단은 API Design의 엔드포인트를 BATCH_SIZE 단위로 나눈 배치마다 독립적으로 이뤄진다(병렬
 * 실행). `chatFn`은 기본값이 실제 lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를
 * 주입해 실제 CLI 서브프로세스 없이 검증한다.
 */
export async function generateBackendDesign(
  api: ApiDesignRecord,
  chatFn: ChatFn = chatViaCli
): Promise<GenerateBackendDesignResult> {
  const batches: ApiEndpoint[][] = [];
  for (let i = 0; i < api.content.endpoints.length; i += BATCH_SIZE) {
    batches.push(api.content.endpoints.slice(i, i + BATCH_SIZE));
  }

  const outcomes = await Promise.all(batches.map((batch) => generateBatch(batch, chatFn)));

  const logic = outcomes.flatMap((o) => o.logic);
  const sharedServices = dedupe(outcomes.flatMap((o) => o.sharedServices));
  const backgroundJobs = dedupe(outcomes.flatMap((o) => o.backgroundJobs));
  const notes = dedupe(outcomes.map((o) => o.implementationNotes).filter((n): n is string => Boolean(n)));
  const simulated = outcomes.some((o) => o.usedFallback);
  const firstSuccess = outcomes.find((o) => !o.usedFallback && o.provider);

  return {
    content: {
      logic,
      sharedServices: sharedServices.length > 0 ? sharedServices : api.content.authenticationStrategy ? ["AuthService"] : [],
      backgroundJobs,
      implementationNotes:
        notes.length > 0
          ? notes.join(" ")
          : "AI Provider 미설정으로 생성된 기본값입니다. 실제 구현 전 비즈니스 규칙을 재검토하세요.",
    },
    simulated,
    provider: firstSuccess?.provider,
    model: firstSuccess?.model,
  };
}
