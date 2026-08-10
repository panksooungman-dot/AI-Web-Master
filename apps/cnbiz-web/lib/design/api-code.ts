import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — API Route Code Generation (AI Business OS 9단계 개발 프로세스의
 * "05 API 설계/구현"을 실제 코드 산출물까지 완성하는 단계). Backend Code(lib/design/backend-code.ts)
 * 가 만든 서비스 함수 위에, HTTP 요청/응답을 그 함수에 연결하는 Next.js Route Handler를 생성한다.
 *
 * 이 Phase는 다른 Design Automation Phase와 달리 **AI를 전혀 호출하지 않는다** — API
 * Design(엔드포인트 method/path/requiresAuth)과 Backend Design(엔드포인트별 serviceFunction
 * 이름)이 이미 구조화된 데이터로 존재하므로, 이 둘을 조합해 Route Handler를 만드는 것은 순수한
 * 기계적 변환이다(packages/cli의 React Generator와 동일한 성격 — 구조화된 데이터 → 결정론적
 * 코드). 그래서 BackendCodeRecord/BackendDesignRecord/ApiDesignRecord에 있는 `simulated`/
 * `provider`/`model` 필드가 이 레코드에는 없다 — 애초에 AI 응답을 기다리는 지점이 없기 때문이다.
 */

export interface GeneratedRouteFile {
  /** 프로젝트 루트 기준 상대 경로(예: "app/api/reservations/route.ts"). */
  path: string;
  /** 완전한 TypeScript 소스(실제 컴파일 가능해야 한다). */
  code: string;
}

/** 생성된 파일이 실제로 동작하려면 프로젝트의 package.json에 반영돼야 하는 것들 —
 *  website-fullstack-adapter.ts가 이 값들을 실제 package.json에 병합한다. */
export interface PackageRequirements {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface ApiCodeContent {
  files: GeneratedRouteFile[];
  /** 수동 작업이 필요한 부분에 대한 안내(한국어) — 예: SUPABASE_URL 설정 필요. */
  notes: string;
  packageRequirements?: PackageRequirements;
}

export interface ApiCodeRecord {
  id: string;
  /** 이 API Code가 어떤 Backend Code(lib/design/backend-code.ts) 위에서 생성됐는지 — Route
   *  Handler가 import하는 서비스 함수가 실제로 존재함을 보장하기 위해 Backend Design이 아닌
   *  Backend Code에 체이닝한다. */
  backendCodeId: string;
  /** BackendCodeRecord.planId를 그대로 복사(다른 Phase와 동일한 편의 체인). */
  planId: string;
  /** 동일 backendCodeId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: ApiCodeContent;
  createdAt: string;
}

const COLLECTION = "design-api-code";

export async function createApiCode(
  entry: Omit<ApiCodeRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<ApiCodeRecord> {
  const records = await store.list<ApiCodeRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.backendCodeId === entry.backendCodeId).length + 1;

  const record: ApiCodeRecord = {
    id: generateId("api-code"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listApiCodes(store: CollectionStore = getDefaultStore()): Promise<ApiCodeRecord[]> {
  const records = await store.list<ApiCodeRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getApiCode(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ApiCodeRecord | null> {
  const records = await store.list<ApiCodeRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Backend Code에서 생성된 API Code만(최신순). */
export async function listApiCodesForBackendCode(
  backendCodeId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ApiCodeRecord[]> {
  const records = await listApiCodes(store);
  return records.filter((record) => record.backendCodeId === backendCodeId);
}

/**
 * 특정 Design Plan에서 생성된 가장 최근 API Code(없으면 null). Website Build가 Review 기반
 * 체인과 이 Plan 기반 체인을 연결할 때 사용한다(database-code.ts의
 * getLatestDatabaseCodeForPlan()과 동일한 원칙).
 */
export async function getLatestApiCodeForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ApiCodeRecord | null> {
  const records = await listApiCodes(store);
  return records.find((record) => record.planId === planId) ?? null;
}
