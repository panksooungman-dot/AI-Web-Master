import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — Backend Code Generation (AI Business OS 9단계 개발 프로세스의 "06
 * 개발(Backend)"을 실제 코드 산출물까지 완성하는 단계). Backend Logic Design
 * (lib/design/backend-design.ts)의 서비스 함수명·검증 규칙·비즈니스 규칙(자연어 텍스트)을 입력으로
 * **실제 컴파일·실행 가능한 TypeScript 서비스 코드**를 생성한다.
 *
 * Backend Design까지의 모든 Design Automation 산출물(Requirement Analysis ~ Test Plan)은
 * "AI가 생성한 구조화된 설계 문서"였다 — validationRules/businessRules는 사람이 읽는 자연어
 * 문장이라 기계적으로 실행할 수 없었다. 이 Phase는 그 자연어 규칙을 실제 `if` 조건·`throw`·
 * 데이터 접근 호출로 번역한 TypeScript 함수 본문을 생성한다는 점에서 다른 Design Automation
 * Phase와 성숙도가 다르다.
 *
 * 특정 DB 벤더(Supabase 등)에 종속되지 않도록, 생성된 함수는 항상 `ServiceDataStore`(신규,
 * 아래) 인터페이스 하나만 통해 데이터에 접근한다 — 실제 배포 시 그 인터페이스를 프로젝트의 실제
 * DB 클라이언트로 구현하기만 하면 된다. Website Builder(React Generator)와의 자동 연결은
 * 아직 없다 — 그 연결은 Review 기반 체인(Wireframe/Prototype/ClaudeDesign)과 이 Plan 기반 체인
 * (Database/API/Backend/TestPlan Design)이 서로 다른 식별자로 연결되어 있어 별도 설계가
 * 필요하다(이번 범위 밖).
 */

export interface GeneratedServiceFile {
  /** 프로젝트 루트 기준 상대 경로(예: "lib/services/reservations.ts"). */
  path: string;
  /** 완전한 TypeScript 소스(실제 컴파일 가능해야 한다). */
  code: string;
}

export interface BackendCodeContent {
  files: GeneratedServiceFile[];
  /** 자동 구현되지 않은 부분·수동 작업이 필요한 부분에 대한 안내(한국어). */
  notes: string;
}

export interface BackendCodeRecord {
  id: string;
  /** 이 Backend Code가 어떤 Backend Design(lib/design/backend-design.ts) 위에서 생성됐는지. */
  backendDesignId: string;
  /** BackendDesignRecord.planId를 그대로 복사(Backend Design이 API Design의 planId를 복사하는
   *  것과 동일한 편의 체인). */
  planId: string;
  /** 동일 backendDesignId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: BackendCodeContent;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-backend-code";

export async function createBackendCode(
  entry: Omit<BackendCodeRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<BackendCodeRecord> {
  const records = await store.list<BackendCodeRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.backendDesignId === entry.backendDesignId).length + 1;

  const record: BackendCodeRecord = {
    id: generateId("backend-code"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listBackendCodes(store: CollectionStore = getDefaultStore()): Promise<BackendCodeRecord[]> {
  const records = await store.list<BackendCodeRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getBackendCode(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<BackendCodeRecord | null> {
  const records = await store.list<BackendCodeRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Backend Design에서 생성된 Backend Code만(최신순). */
export async function listBackendCodesForBackendDesign(
  backendDesignId: string,
  store: CollectionStore = getDefaultStore()
): Promise<BackendCodeRecord[]> {
  const records = await listBackendCodes(store);
  return records.filter((record) => record.backendDesignId === backendDesignId);
}

/**
 * 특정 Design Plan에서 생성된 가장 최근 Backend Code(없으면 null). Website Build가 Review 기반
 * 체인과 이 Plan 기반 체인을 연결할 때 사용한다(database-code.ts의
 * getLatestDatabaseCodeForPlan()과 동일한 원칙).
 */
export async function getLatestBackendCodeForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<BackendCodeRecord | null> {
  const records = await listBackendCodes(store);
  return records.find((record) => record.planId === planId) ?? null;
}
