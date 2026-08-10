import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — Database Migration Code Generation (AI Business OS 9단계 개발
 * 프로세스의 "04 DB 설계"를 실제 실행 가능한 SQL로 완성하는 단계). Database Design
 * (lib/design/database-design.ts)의 ERD/Table/Relationship/Index/RLS Policy를 실제 Supabase
 * Postgres 마이그레이션 SQL로 번역한다.
 *
 * Table/Relationship/Index DDL은 이미 구조화된 데이터(컬럼명·타입·제약)로부터 100% 결정론적으로
 * 생성 가능하다(AI 호출 없음) — packages/cli의 React Generator, 이 저장소의 api-code.ts와 동일한
 * "구조화된 데이터 → 결정론적 코드" 성격. 단, RLS Policy(`rlsPolicies[].description`)는 자연어
 * 문장("본인 예약만 조회 가능")이라 실제 `CREATE POLICY` SQL로 번역하려면 AI가 필요하다(어느
 * 컬럼이 "소유자"를 나타내는지 등 의미 추론이 필요함) — 그래서 이 Phase만 backend-code.ts와
 * 같은 chatViaCli() 배치 + 결정론적 폴백 패턴을 쓴다.
 */

export interface GeneratedMigrationFile {
  /** 프로젝트 루트 기준 상대 경로(예: "supabase/migrations/0001_initial_schema.sql"). */
  path: string;
  /** 완전한 SQL(실제 실행 가능해야 한다). */
  code: string;
}

export interface DatabaseCodeContent {
  files: GeneratedMigrationFile[];
  /** 수동 작업이 필요한 부분에 대한 안내(한국어) — 예: 허용적 기본 RLS 정책은 반드시 교체 필요. */
  notes: string;
}

export interface DatabaseCodeRecord {
  id: string;
  /** 이 Database Code가 어떤 Database Design(lib/design/database-design.ts) 위에서 생성됐는지. */
  databaseDesignId: string;
  /** DatabaseDesignRecord.planId를 그대로 복사(다른 Phase와 동일한 편의 체인). */
  planId: string;
  /** 동일 databaseDesignId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: DatabaseCodeContent;
  /** RLS Policy 번역 중 하나라도 AI 응답 없이 결정론적 허용 기본값으로 폴백됐는지 — Table/
   *  Relationship/Index DDL은 항상 결정론적이라 이 플래그와 무관하게 항상 생성된다. */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-database-code";

export async function createDatabaseCode(
  entry: Omit<DatabaseCodeRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseCodeRecord> {
  const records = await store.list<DatabaseCodeRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.databaseDesignId === entry.databaseDesignId).length + 1;

  const record: DatabaseCodeRecord = {
    id: generateId("database-code"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listDatabaseCodes(store: CollectionStore = getDefaultStore()): Promise<DatabaseCodeRecord[]> {
  const records = await store.list<DatabaseCodeRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getDatabaseCode(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseCodeRecord | null> {
  const records = await store.list<DatabaseCodeRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Database Design에서 생성된 Database Code만(최신순). */
export async function listDatabaseCodesForDatabaseDesign(
  databaseDesignId: string,
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseCodeRecord[]> {
  const records = await listDatabaseCodes(store);
  return records.filter((record) => record.databaseDesignId === databaseDesignId);
}

/**
 * 특정 Design Plan에서 생성된 가장 최근 Database Code(없으면 null). Website Build가 Review
 * 기반 체인(Storyboard/Wireframe/Prototype/ClaudeDesign)과 이 Plan 기반 체인(Database/API/
 * Backend/Test Code)을 연결할 때 사용한다 — 두 체인은 서로 직접 참조하지 않고 planId만
 * 공유하므로, "이 Plan에 대해 가장 최근 생성된 것"을 최선의 추정으로 삼는다.
 */
export async function getLatestDatabaseCodeForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseCodeRecord | null> {
  const records = await listDatabaseCodes(store);
  return records.find((record) => record.planId === planId) ?? null;
}
