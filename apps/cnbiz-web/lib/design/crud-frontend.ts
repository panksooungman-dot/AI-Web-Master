import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — CRUD Frontend Generation (AI Business OS 9단계 개발 프로세스의
 * "07 디자인 코딩(Frontend)"을 Chain B(Database→API→Backend→Test) 위에서 실제로 동작하는 화면까지
 * 완성하는 단계). Chain A의 React Generator(Wireframe 기반)는 화면 레이아웃만 만들 뿐 그 화면이
 * 실제 데이터를 어느 리소스에서 가져와야 하는지 전혀 모른다(Wireframe에는 "Form"·"Table" 같은
 * 시각적 컴포넌트 타입만 있고 "이 Form은 상가 리소스용이다" 같은 의미 정보가 없다) — 그래서
 * 생성된 폼이 `onSubmit={handleSubmit_X}` 같은 빈 스텁만 갖고 실제 백엔드를 호출하지 못했다.
 *
 * 이 Phase는 그 반대 방향에서 접근한다 — Wireframe의 추상적 컴포넌트를 해석하는 대신, API
 * Code(lib/design/api-code.ts)가 만든 `lib/api-client.ts`의 실제 함수 이름(Backend Design의
 * serviceFunction과 정확히 동일)과 Database Design의 테이블 컬럼 정보만으로, 리소스마다 목록·
 * 등록·수정 3개 화면을 실제로 그 함수를 호출하는 코드로 직접 생성한다. AI를 호출하지 않는다
 * (api-code.ts와 동일한 이유 — Backend Design/Database Design이 이미 구조화된 데이터라 순수한
 * 기계적 변환).
 */

export interface GeneratedFrontendFile {
  /** 프로젝트 루트 기준 상대 경로(예: "app/상가/page.tsx"). */
  path: string;
  /** 완전한 TypeScript/TSX 소스(실제 컴파일 가능해야 한다). */
  code: string;
}

export interface CrudFrontendContent {
  files: GeneratedFrontendFile[];
  /** 수동 작업이 필요한 부분에 대한 안내(한국어) — 예: Database Design과 이름이 일치하지 않아
   *  필드 정보 없이 최소 폼으로 생성된 리소스 목록. */
  notes: string;
}

export interface CrudFrontendRecord {
  id: string;
  /** 이 CRUD Frontend가 어떤 API Code(lib/design/api-code.ts) 위에서 생성됐는지 — 화면이
   *  import하는 lib/api-client.ts 함수가 실제로 존재함을 보장하기 위해 API Code에 체이닝한다. */
  apiCodeId: string;
  /** 폼 필드(컬럼명·타입)를 채우는 데 사용한 Database Design. */
  databaseDesignId: string;
  /** ApiCodeRecord.planId를 그대로 복사(다른 Phase와 동일한 편의 체인). */
  planId: string;
  /** 동일 apiCodeId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: CrudFrontendContent;
  createdAt: string;
}

const COLLECTION = "design-crud-frontend";

export async function createCrudFrontend(
  entry: Omit<CrudFrontendRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<CrudFrontendRecord> {
  const records = await store.list<CrudFrontendRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.apiCodeId === entry.apiCodeId).length + 1;

  const record: CrudFrontendRecord = {
    id: generateId("crud-frontend"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listCrudFrontends(store: CollectionStore = getDefaultStore()): Promise<CrudFrontendRecord[]> {
  const records = await store.list<CrudFrontendRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getCrudFrontend(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<CrudFrontendRecord | null> {
  const records = await store.list<CrudFrontendRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 API Code에서 생성된 CRUD Frontend만(최신순). */
export async function listCrudFrontendsForApiCode(
  apiCodeId: string,
  store: CollectionStore = getDefaultStore()
): Promise<CrudFrontendRecord[]> {
  const records = await listCrudFrontends(store);
  return records.filter((record) => record.apiCodeId === apiCodeId);
}

/**
 * 특정 Design Plan에서 생성된 가장 최근 CRUD Frontend(없으면 null). Website Build가 Review 기반
 * 체인과 이 Plan 기반 체인을 연결할 때 사용한다(database-code.ts의
 * getLatestDatabaseCodeForPlan()과 동일한 원칙).
 */
export async function getLatestCrudFrontendForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<CrudFrontendRecord | null> {
  const records = await listCrudFrontends(store);
  return records.find((record) => record.planId === planId) ?? null;
}
