import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { DatabaseDesignRecord } from "./database-design";
import type { ApiDesignContent, ApiEndpoint, HttpMethod } from "./api-design";

const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const SYSTEM_PROMPT =
  "You are a senior API architect for AI Business OS's Design Automation system. Given a project's " +
  "database schema (tables and relationships), design the REST API it needs. Produce a single JSON " +
  "object (no prose, no markdown fences) with exactly these keys: endpoints, authenticationStrategy, " +
  "fileUploadEndpoints, apiTestNotes. Every endpoint `method` must be one of exactly: " +
  HTTP_METHODS.join(", ") +
  ". Design a standard CRUD-shaped REST API for tables that clearly need it, and only add extra " +
  "endpoints the schema/relationships actually justify. `fileUploadEndpoints` must be a subset of " +
  "the endpoint paths you defined.";

function buildUserPrompt(db: DatabaseDesignRecord): string {
  return `Database Tables:
${JSON.stringify(db.content.tables)}

Relationships:
${JSON.stringify(db.content.relationships)}

Return ONLY a JSON object shaped like:
{
  "endpoints": [{
    "method": string, "path": string, "description": string, "requiresAuth": boolean,
    "requestBody": string, "responseShape": string
  }],
  "authenticationStrategy": string (한국어 1~2문장),
  "fileUploadEndpoints": string[] (endpoints 중 파일 업로드가 필요한 path만),
  "apiTestNotes": string (한국어 1~2문장, API 테스트 시 우선순위)
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

function isHttpMethod(value: unknown): value is HttpMethod {
  return typeof value === "string" && (HTTP_METHODS as string[]).includes(value);
}

function isApiEndpoint(value: unknown): value is ApiEndpoint {
  if (typeof value !== "object" || value === null) return false;
  const endpoint = value as Record<string, unknown>;
  return (
    isHttpMethod(endpoint.method) &&
    isNonEmptyString(endpoint.path) &&
    typeof endpoint.description === "string" &&
    typeof endpoint.requiresAuth === "boolean" &&
    typeof endpoint.requestBody === "string" &&
    typeof endpoint.responseShape === "string"
  );
}

/**
 * AI 응답을 ApiDesignContent로 파싱한다. 하나라도 어긋나면 null을 반환해 호출자가 결정론적
 * 기본값으로 폴백하도록 한다(lib/design/database-design-generator.ts와 동일한 all-or-nothing 원칙).
 */
export function parseApiDesignContent(raw: string): ApiDesignContent | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.endpoints) || obj.endpoints.length === 0 || !obj.endpoints.every(isApiEndpoint)) return null;
  if (!isNonEmptyString(obj.authenticationStrategy)) return null;
  if (!Array.isArray(obj.fileUploadEndpoints) || !obj.fileUploadEndpoints.every((p) => typeof p === "string")) {
    return null;
  }
  if (!isNonEmptyString(obj.apiTestNotes)) return null;

  return {
    endpoints: obj.endpoints,
    authenticationStrategy: obj.authenticationStrategy,
    fileUploadEndpoints: obj.fileUploadEndpoints,
    apiTestNotes: obj.apiTestNotes,
  };
}

/**
 * Database Design만으로 항상 유효한 API Design을 만드는 결정론적 폴백 — Provider 미설정이거나
 * 응답 파싱에 실패해도 빈 API가 되지 않는다. 테이블 하나당 표준 CRUD 5종 엔드포인트를 대응시키는
 * 단순한 규칙(users 테이블은 인증에만 쓰이므로 CRUD 대상에서 제외).
 */
export function buildDefaultApiDesign(db: DatabaseDesignRecord): ApiDesignContent {
  const resourceTables = db.content.tables.filter((table) => table.name !== "users");

  const endpoints: ApiEndpoint[] = resourceTables.flatMap((table) => {
    const base = `/api/${table.name}`;
    return [
      { method: "GET" as HttpMethod, path: base, description: `${table.description || table.name} 목록 조회`, requiresAuth: false, requestBody: "", responseShape: `${table.name}[]` },
      { method: "POST" as HttpMethod, path: base, description: `${table.description || table.name} 생성`, requiresAuth: true, requestBody: table.name, responseShape: table.name },
      { method: "GET" as HttpMethod, path: `${base}/:id`, description: `${table.description || table.name} 단건 조회`, requiresAuth: false, requestBody: "", responseShape: table.name },
      { method: "PATCH" as HttpMethod, path: `${base}/:id`, description: `${table.description || table.name} 수정`, requiresAuth: true, requestBody: `Partial<${table.name}>`, responseShape: table.name },
      { method: "DELETE" as HttpMethod, path: `${base}/:id`, description: `${table.description || table.name} 삭제`, requiresAuth: true, requestBody: "", responseShape: "{ success: boolean }" },
    ];
  });

  return {
    endpoints,
    authenticationStrategy: "AI Provider 미설정으로 생성된 기본값입니다. 세션 기반 인증을 우선 검토하세요.",
    fileUploadEndpoints: [],
    apiTestNotes: "AI Provider 미설정으로 생성된 기본값입니다. 각 리소스의 CRUD 엔드포인트부터 테스트를 작성하세요.",
  };
}

export interface GenerateApiDesignResult {
  content: ApiDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
}

/**
 * Resolve(Provider 호출) → parse → 실패 시 결정론적 기본값 폴백. `chatFn`은 기본값이 실제
 * lib/ai/bridge.ts의 chatViaCli()이며, 테스트에서는 가짜 함수를 주입해 실제 CLI 서브프로세스
 * 없이 검증한다.
 */
export async function generateApiDesign(
  databaseDesign: DatabaseDesignRecord,
  chatFn: (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult> = chatViaCli
): Promise<GenerateApiDesignResult> {
  const result = await chatFn(buildUserPrompt(databaseDesign), { system: SYSTEM_PROMPT });

  if (result.success && result.content) {
    const parsed = parseApiDesignContent(result.content);
    if (parsed) {
      return { content: parsed, simulated: false, provider: result.provider, model: result.model };
    }
  }

  return { content: buildDefaultApiDesign(databaseDesign), simulated: true };
}
