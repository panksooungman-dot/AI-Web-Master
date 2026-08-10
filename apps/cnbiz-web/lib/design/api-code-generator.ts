import type { ApiDesignRecord, ApiEndpoint } from "./api-design";
import type { BackendDesignRecord, BackendLogicEndpoint } from "./backend-design";
import type { ApiCodeContent, GeneratedRouteFile } from "./api-code";

/**
 * API Design(엔드포인트 method/path/requiresAuth/fileUploadEndpoints)과 Backend
 * Design(엔드포인트별 serviceFunction 이름)을 조합해 Next.js Route Handler + 그 주변 실행
 * 인프라(실제 Supabase 연결·인증 가드·파일 업로드·OpenAPI 문서·프론트엔드 API 클라이언트·구조화
 * 로깅)를 생성한다. 순수 함수(파일시스템 접근 없음) — Backend Code Generator
 * (backend-code-generator.ts)와 달리 AI를 호출하지 않는다: 이 변환은 이미 구조화된 데이터를
 * 조합하는 것뿐이라 결정론적으로 항상 옳다.
 */

const SUPABASE_JS_VERSION = "^2.108.2";

function buildSupabaseStoreFile(): GeneratedRouteFile {
  return {
    path: "lib/services/supabaseStore.ts",
    code: `import { createClient } from "@supabase/supabase-js";
import type { ServiceDataStore } from "./types";

/**
 * 실제 Supabase Postgres에 연결하는 ServiceDataStore 구현. 특정 테이블 스키마에 종속되지
 * 않는다 — table 인자로 받은 이름을 그대로 사용하므로, 04(DB) 단계가 만든 마이그레이션의 테이블
 * 이름과 일치하기만 하면 된다.
 */
export function createSupabaseServiceStore(url: string, serviceRoleKey: string): ServiceDataStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async find<T = unknown>(table: string, query: Record<string, unknown> = {}): Promise<T[]> {
      let request = client.from(table).select("*");
      for (const [key, value] of Object.entries(query)) {
        request = request.eq(key, value as string | number | boolean);
      }
      const { data, error } = await request;
      if (error) throw new Error(\`[supabaseStore] find("\${table}") 실패: \${error.message}\`);
      return (data ?? []) as T[];
    },
    async findOne<T = unknown>(table: string, id: string): Promise<T | null> {
      const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(\`[supabaseStore] findOne("\${table}", "\${id}") 실패: \${error.message}\`);
      return (data as T) ?? null;
    },
    async insert<T = unknown>(table: string, data: Record<string, unknown>): Promise<T> {
      const { data: inserted, error } = await client.from(table).insert(data).select().single();
      if (error) throw new Error(\`[supabaseStore] insert("\${table}") 실패: \${error.message}\`);
      return inserted as T;
    },
    async update<T = unknown>(table: string, id: string, data: Record<string, unknown>): Promise<T> {
      const { data: updated, error } = await client.from(table).update(data).eq("id", id).select().single();
      if (error) throw new Error(\`[supabaseStore] update("\${table}", "\${id}") 실패: \${error.message}\`);
      return updated as T;
    },
    async remove(table: string, id: string): Promise<void> {
      const { error } = await client.from(table).delete().eq("id", id);
      if (error) throw new Error(\`[supabaseStore] remove("\${table}", "\${id}") 실패: \${error.message}\`);
    },
  };
}
`,
  };
}

const STORE_FILE_PATH = "lib/services/store.ts";

function buildStoreFile(): GeneratedRouteFile {
  return {
    path: STORE_FILE_PATH,
    code: `import type { ServiceDataStore } from "./types";
import { createSupabaseServiceStore } from "./supabaseStore";

let cachedStore: ServiceDataStore | null = null;

/**
 * 모든 생성된 Route Handler·서비스 함수가 사용하는 ServiceDataStore 구현을 반환한다.
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 환경 변수가 설정되어 있으면 실제 Supabase에
 * 연결한다(lib/services/supabaseStore.ts). 설정되어 있지 않으면 명확한 오류를 던진다 — 값이
 * 비어 있는 것과 잘못 설정된 것이 겉으로 구분되지 않는 조용한 실패를 피하기 위함이다.
 */
export function getServiceStore(): ServiceDataStore {
  if (cachedStore) return cachedStore;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "getServiceStore()가 아직 실제 데이터베이스에 연결되지 않았습니다. SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정하세요."
    );
  }

  cachedStore = createSupabaseServiceStore(url, serviceRoleKey);
  return cachedStore;
}
`,
  };
}

function buildAuthGuardFile(): GeneratedRouteFile {
  return {
    path: "lib/auth-guard.ts",
    code: `export interface AuthContext {
  userId: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * 세션 쿠키(이름: "session")로 인증 여부를 확인한다. 지금은 쿠키 값을 그대로 userId로 사용하는
 * 최소 구현이다 — 실제 배포 전 서명된 JWT 검증 또는 서버 측 세션 조회로 교체하세요.
 */
export function getAuthContext(request: Request): AuthContext | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\\s*)session=([^;]+)/);
  if (!match) return null;
  return { userId: decodeURIComponent(match[1]) };
}

/** 인증되지 않았으면 AuthError를 던진다(호출자가 401로 변환) — 세션이 없다고 조용히 진행하지 않는다. */
export function requireAuth(request: Request): AuthContext {
  const context = getAuthContext(request);
  if (!context) throw new AuthError("인증이 필요합니다.");
  return context;
}
`,
  };
}

function buildLoggerFile(): GeneratedRouteFile {
  return {
    path: "lib/logger.ts",
    code: `type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...meta });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/** 요청 단위 구조화 로깅에 사용하는 최소 로거 — 실제 배포 시 로그 수집 서비스(예: Datadog,
 *  CloudWatch)로 교체하거나 그쪽으로 전달하도록 확장하세요. */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
`,
  };
}

function buildFileStorageFile(): GeneratedRouteFile {
  return {
    path: "lib/file-storage.ts",
    code: `import fs from "fs/promises";
import path from "path";

export interface UploadedFile {
  url: string;
  fileName: string;
  contentType: string;
  size: number;
}

/**
 * 파일을 저장하고 접근 가능한 URL을 반환한다. SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY가
 * 설정되어 있으면 Supabase Storage("uploads" 버킷)를, 아니면 로컬 public/uploads/ 디렉터리를
 * 사용한다(lib/services/store.ts의 getServiceStore()와 동일한 resolve 규칙).
 */
export async function uploadFile(fileName: string, buffer: Buffer, contentType: string): Promise<UploadedFile> {
  const safeName = \`\${Date.now()}-\${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}\`;
  const url =
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
      ? await uploadToSupabase(safeName, buffer, contentType)
      : await uploadToLocalDisk(safeName, buffer);

  return { url, fileName: safeName, contentType, size: buffer.length };
}

async function uploadToLocalDisk(safeName: string, buffer: Buffer): Promise<string> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(path.join(uploadsDir, safeName), buffer);
  return \`/uploads/\${safeName}\`;
}

async function uploadToSupabase(safeName: string, buffer: Buffer, contentType: string): Promise<string> {
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucket = "uploads";
  await client.storage.createBucket(bucket, { public: true }).catch(() => undefined);

  const { error } = await client.storage.from(bucket).upload(safeName, buffer, { contentType, upsert: true });
  if (error) throw new Error(\`[file-storage] Supabase 업로드 실패: \${error.message}\`);

  return client.storage.from(bucket).getPublicUrl(safeName).data.publicUrl;
}
`,
  };
}

/** "/api/reservations/:id" → "reservations", "/api/reservations" → "reservations". */
function isPathParamSegment(segment: string): boolean {
  return segment.startsWith(":") || (segment.startsWith("{") && segment.endsWith("}"));
}

function extractResource(path: string): string {
  const segments = path.split("/").filter((segment) => segment && segment !== "api" && !isPathParamSegment(segment));
  return segments[0] ?? "resource";
}

function toFileSlug(resource: string): string {
  return resource.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-+|-+$/g, "") || "resource";
}

/** 경로 파라미터 존재 여부 — ":id"(Express류)와 "{id}"(OpenAPI류) 두 표기 모두 인식한다.
 *  API Design 생성기가 특정 표기를 강제하지 않아, AI가 실제로 어느 쪽을 쓸지는 실행 전까지 알 수
 *  없다(2026-08-10 실 E2E에서 "{id}" 표기가 실제로 관측되어 이 함수를 추가하게 됨 — 이전에는
 *  ":id"만 인식해 item-level 라우트가 collection-level 파일에 잘못 합쳐지고 같은 이름의
 *  `export function GET`이 중복 선언되는 실제 컴파일 오류를 만들었다). Next.js 라우트 폴더/
 *  핸들러의 파라미터 이름 자체는 API Design이 어떤 표기를 쓰든 항상 "id"로 고정한다 —
 *  ServiceDataStore(findOne/update/remove)가 이미 "id"라는 이름을 계약으로 못박고 있기 때문이다.*/
function hasPathParam(path: string): boolean {
  return path.split("/").some(isPathParamSegment);
}

interface RouteEntry {
  method: string;
  path: string;
  serviceFunction: string;
  requiresAuth: boolean;
  isFileUpload: boolean;
}

function findMatchingEndpoint(logic: BackendLogicEndpoint, endpoints: ApiEndpoint[]): ApiEndpoint | undefined {
  return endpoints.find((endpoint) => endpoint.method === logic.method && endpoint.path === logic.path);
}

function buildRouteEntries(backend: BackendDesignRecord, api: ApiDesignRecord): RouteEntry[] {
  const fileUploadPaths = new Set(api.content.fileUploadEndpoints);

  return backend.content.logic.map((logic) => ({
    method: logic.method,
    path: logic.path,
    serviceFunction: logic.serviceFunction,
    requiresAuth: findMatchingEndpoint(logic, api.content.endpoints)?.requiresAuth ?? false,
    isFileUpload: logic.method === "POST" && fileUploadPaths.has(logic.path),
  }));
}

const ERROR_RESPONSE =
  '{ error: error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다." }, { status: 400 }';

/** try 블록 안 첫 문장으로 삽입된다(4칸 들여쓰기) — try 밖에 두면 requireAuth()가 던지는
 *  AuthError가 catchBlock()의 401 변환을 거치지 못하고 핸들러 밖으로 그대로 전파되어 Next.js의
 *  일반 500 오류가 된다(실제 Route Handler를 호출하는 통합 테스트로 처음 드러난 버그 — 기존
 *  단위 테스트는 서비스 함수만 직접 호출해 이 배선을 전혀 거치지 않았다). */
function authGuard(entry: RouteEntry): string {
  return entry.requiresAuth ? "    requireAuth(request);\n" : "";
}

/** try/catch의 catch 블록 — 인증이 필요한 엔드포인트는 AuthError를 401로, 나머지는 기존처럼
 *  400으로 변환한다. 성공/실패 모두 logger로 남긴다. */
function catchBlock(entry: RouteEntry): string {
  const authCase = entry.requiresAuth
    ? `    if (error instanceof AuthError) {\n      logger.warn("${entry.serviceFunction} 인증 실패");\n      return NextResponse.json({ error: error.message }, { status: 401 });\n    }\n`
    : "";
  return `  } catch (error) {\n${authCase}    logger.error("${entry.serviceFunction} 실패", { error: error instanceof Error ? error.message : String(error) });\n    return NextResponse.json(${ERROR_RESPONSE});\n  }\n}`;
}

function successLog(entry: RouteEntry): string {
  return `    logger.info("${entry.serviceFunction} 성공");\n`;
}

function buildFileUploadHandler(entry: RouteEntry): string {
  const guard = authGuard(entry);
  return (
    `export async function POST(request: Request) {\n  const formData = await request.formData();\n` +
    `  const file = formData.get("file");\n` +
    `  if (!(file instanceof File)) {\n    return NextResponse.json({ error: "file 필드가 필요합니다." }, { status: 400 });\n  }\n\n` +
    `  const buffer = Buffer.from(await file.arrayBuffer());\n  const store = getServiceStore();\n\n` +
    `  try {\n${guard}` +
    `    const uploaded = await uploadFile(file.name, buffer, file.type);\n` +
    `    const result = await ${entry.serviceFunction}({ ...uploaded }, store);\n` +
    successLog(entry) +
    `    return NextResponse.json(result, { status: 201 });\n` +
    catchBlock(entry)
  );
}

function buildHandler(entry: RouteEntry): string {
  if (entry.isFileUpload) return buildFileUploadHandler(entry);

  const guard = authGuard(entry);
  const hasId = hasPathParam(entry.path);

  switch (entry.method) {
    case "GET":
      return hasId
        ? `export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const store = getServiceStore();\n  try {\n${guard}    const result = await ${entry.serviceFunction}({ id }, store);\n${successLog(entry)}    return NextResponse.json(result);\n${catchBlock(entry)}`
        : `export async function GET(request: Request) {\n  const { searchParams } = new URL(request.url);\n  const query = Object.fromEntries(searchParams.entries());\n  const store = getServiceStore();\n  try {\n${guard}    const result = await ${entry.serviceFunction}(query, store);\n${successLog(entry)}    return NextResponse.json(result);\n${catchBlock(entry)}`;
    case "POST":
      return `export async function POST(request: Request) {\n  const input = await request.json();\n  const store = getServiceStore();\n  try {\n${guard}    const result = await ${entry.serviceFunction}(input, store);\n${successLog(entry)}    return NextResponse.json(result, { status: 201 });\n${catchBlock(entry)}`;
    case "PUT":
    case "PATCH":
      return `export async function ${entry.method}(request: Request, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const body = await request.json();\n  const store = getServiceStore();\n  try {\n${guard}    const result = await ${entry.serviceFunction}({ ...body, id }, store);\n${successLog(entry)}    return NextResponse.json(result);\n${catchBlock(entry)}`;
    case "DELETE":
      return `export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {\n  const { id } = await params;\n  const store = getServiceStore();\n  try {\n${guard}    const result = await ${entry.serviceFunction}({ id }, store);\n${successLog(entry)}    return NextResponse.json(result);\n${catchBlock(entry)}`;
    default:
      return `// 지원하지 않는 HTTP 메서드입니다: ${entry.method}`;
  }
}

function routeFilePath(resource: string, hasId: boolean): string {
  return hasId ? `app/api/${resource}/[id]/route.ts` : `app/api/${resource}/route.ts`;
}

/**
 * `app/api/<resource>/route.ts` → 3단계 위(`../../../`), `app/api/<resource>/[id]/route.ts` →
 * 4단계 위(`../../../../`)로 상대 경로 깊이가 다르다. 이전 버전은 이 값을 "../../../"로
 * 고정해뒀는데, item-level 라우트(`[id]/route.ts`)는 실제로는 한 단계 더 깊어서 생성된
 * `import ... from "../../../lib/services/store"`가 실제로는 `app/api/lib/services/store`를
 * 가리키는 잘못된 경로였다 — 실제 프로젝트에 파일을 써서 빌드해보지 않으면(단일 파일 구문
 * 검사만으로는) 드러나지 않는 종류의 버그였다.
 */
function relativeRootPrefix(routeFilePath: string): string {
  const depth = routeFilePath.split("/").length - 1;
  return "../".repeat(depth);
}

function buildRouteFile(path: string, resource: string, entries: RouteEntry[]): GeneratedRouteFile {
  const importNames = Array.from(new Set(entries.map((entry) => entry.serviceFunction)));
  const needsAuth = entries.some((entry) => entry.requiresAuth);
  const needsUpload = entries.some((entry) => entry.isFileUpload);
  const root = relativeRootPrefix(path);

  const header =
    `import { NextResponse } from "next/server";\n` +
    `import { ${importNames.join(", ")} } from "${root}lib/services/${resource}";\n` +
    `import { getServiceStore } from "${root}lib/services/store";\n` +
    `import { logger } from "${root}lib/logger";\n` +
    (needsAuth ? `import { requireAuth, AuthError } from "${root}lib/auth-guard";\n` : "") +
    (needsUpload ? `import { uploadFile } from "${root}lib/file-storage";\n` : "") +
    "\n";
  const handlers = entries.map(buildHandler).join("\n\n");

  return { path, code: `${header}${handlers}\n` };
}

const HTTP_STATUS_METHOD: Record<string, string> = { POST: "201" };

function openApiPath(rawPath: string): string {
  return rawPath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
}

function buildOpenApiSpec(api: ApiDesignRecord): GeneratedRouteFile {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const endpoint of api.content.endpoints) {
    const normalizedPath = openApiPath(endpoint.path);
    const pathItem = paths[normalizedPath] ?? {};
    const hasId = normalizedPath.includes("{");

    const responses: Record<string, unknown> = {
      [HTTP_STATUS_METHOD[endpoint.method] ?? "200"]: {
        description: endpoint.responseShape || "성공",
        content: { "application/json": { schema: { type: "object", description: endpoint.responseShape } } },
      },
    };
    if (endpoint.requiresAuth) responses["401"] = { description: "인증 필요" };
    if (hasId) responses["404"] = { description: "대상을 찾을 수 없음" };

    pathItem[endpoint.method.toLowerCase()] = {
      summary: endpoint.description,
      ...(hasId ? { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }] } : {}),
      ...(endpoint.requestBody
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", description: endpoint.requestBody } } },
            },
          }
        : {}),
      responses,
      ...(endpoint.requiresAuth ? { security: [{ cookieAuth: [] }] } : {}),
    };

    paths[normalizedPath] = pathItem;
  }

  const spec = {
    openapi: "3.0.3",
    info: { title: "Generated API", version: "1.0.0", description: api.content.authenticationStrategy },
    paths,
    components: { securitySchemes: { cookieAuth: { type: "apiKey", in: "cookie", name: "session" } } },
  };

  return { path: "openapi.json", code: `${JSON.stringify(spec, null, 2)}\n` };
}

function clientPathTemplate(rawPath: string): string {
  return rawPath.replace(/:[a-zA-Z0-9_]+|\{[a-zA-Z0-9_]+\}/, "${id}");
}

function buildClientFunction(entry: BackendLogicEndpoint): string {
  const hasId = hasPathParam(entry.path);
  const urlTemplate = clientPathTemplate(entry.path);

  switch (entry.method) {
    case "GET":
      return hasId
        ? `export async function ${entry.serviceFunction}(id: string): Promise<unknown> {\n  const response = await fetch(\`${urlTemplate}\`);\n  if (!response.ok) throw new Error(\`${entry.serviceFunction} 실패: \${response.status}\`);\n  return response.json();\n}`
        : `export async function ${entry.serviceFunction}(query: Record<string, string> = {}): Promise<unknown> {\n  const search = new URLSearchParams(query).toString();\n  const response = await fetch(\`${entry.path}\${search ? \`?\${search}\` : ""}\`);\n  if (!response.ok) throw new Error(\`${entry.serviceFunction} 실패: \${response.status}\`);\n  return response.json();\n}`;
    case "POST":
      return `export async function ${entry.serviceFunction}(input: Record<string, unknown>): Promise<unknown> {\n  const response = await fetch(\`${entry.path}\`, {\n    method: "POST",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify(input),\n  });\n  if (!response.ok) throw new Error(\`${entry.serviceFunction} 실패: \${response.status}\`);\n  return response.json();\n}`;
    case "PUT":
    case "PATCH":
      return `export async function ${entry.serviceFunction}(id: string, input: Record<string, unknown>): Promise<unknown> {\n  const response = await fetch(\`${urlTemplate}\`, {\n    method: "${entry.method}",\n    headers: { "Content-Type": "application/json" },\n    body: JSON.stringify(input),\n  });\n  if (!response.ok) throw new Error(\`${entry.serviceFunction} 실패: \${response.status}\`);\n  return response.json();\n}`;
    case "DELETE":
      return `export async function ${entry.serviceFunction}(id: string): Promise<unknown> {\n  const response = await fetch(\`${urlTemplate}\`, { method: "DELETE" });\n  if (!response.ok) throw new Error(\`${entry.serviceFunction} 실패: \${response.status}\`);\n  return response.json();\n}`;
    default:
      return `// 지원하지 않는 HTTP 메서드입니다: ${entry.method}`;
  }
}

function buildApiClientFile(backend: BackendDesignRecord): GeneratedRouteFile {
  const functions = backend.content.logic.map(buildClientFunction).join("\n\n");
  return {
    path: "lib/api-client.ts",
    code:
      `/** 05단계가 생성한 API를 프론트엔드에서 호출하기 위한 fetch 래퍼. 함수 이름은 06(Backend)의\n` +
      ` *  서비스 함수명과 동일하다 — 서버가 무엇을 하는지와 클라이언트가 무엇을 호출하는지가\n` +
      ` *  항상 대응되도록. 응답 형태는 openapi.json의 responseShape 설명을 참고하세요. */\n\n${functions}\n`,
  };
}

/**
 * API Design + Backend Design 위에서 Next.js Route Handler와 그 실행 인프라를 생성한다 — AI를
 * 호출하지 않는 순수 함수. Backend Design의 로직 항목을 리소스·collection/item 레벨(경로에
 * path param 포함 여부)로 그룹화해 Next.js App Router 관례(`app/api/<resource>/route.ts`,
 * `app/api/<resource>/[id]/route.ts`)에 맞춰 파일을 나눈다. 같은 파일에 속하는 여러 HTTP
 * 메서드(예: GET+POST)는 하나의 파일에 각각의 export function으로 함께 담긴다.
 */
export function generateApiCode(backend: BackendDesignRecord, api: ApiDesignRecord): ApiCodeContent {
  const entries = buildRouteEntries(backend, api);
  const byPath = new Map<string, { resource: string; entries: RouteEntry[] }>();

  for (const entry of entries) {
    const resource = toFileSlug(extractResource(entry.path));
    const path = routeFilePath(resource, hasPathParam(entry.path));
    const group = byPath.get(path) ?? { resource, entries: [] };
    group.entries.push(entry);
    byPath.set(path, group);
  }

  const routeFiles = Array.from(byPath.entries()).map(([path, group]) => buildRouteFile(path, group.resource, group.entries));
  const hasFileUpload = entries.some((entry) => entry.isFileUpload);

  return {
    files: [
      buildStoreFile(),
      buildSupabaseStoreFile(),
      buildAuthGuardFile(),
      buildLoggerFile(),
      ...(hasFileUpload ? [buildFileStorageFile()] : []),
      ...routeFiles,
      buildOpenApiSpec(api),
      buildApiClientFile(backend),
    ],
    notes:
      "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 환경 변수를 설정하면 실제 DB에 연결됩니다(lib/services/store.ts). " +
      "lib/auth-guard.ts는 세션 쿠키 존재 여부만 확인하는 최소 구현이므로 실제 배포 전 서명 검증으로 교체하세요.",
    packageRequirements: {
      dependencies: { "@supabase/supabase-js": SUPABASE_JS_VERSION },
    },
  };
}
