import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — Database Design (AI Business OS 9단계 개발 프로세스의 "04
 * Database"). Phase 1(lib/design/generator.ts)의 Design Plan(Requirement Analysis/Feature
 * List/Screen List)을 입력으로 ERD·Table·Relationship·Index·RLS Policy를 AI가 생성한다. 이
 * 파일은 타입 + fs-JSON registry, 생성 로직은 database-design-generator.ts에 있다(Phase 2~9와
 * 동일한 파일 분리 관례).
 *
 * 이 산출물은 "AI가 생성한 구조화된 설계 문서"다 — 실제 SQL 마이그레이션을 실행하거나 진짜
 * 데이터베이스에 테이블을 만들지 않는다(Phase 1의 Requirement Analysis가 실제 코드가 아닌
 * 구조화된 분석 문서인 것과 동일한 성숙도).
 */

export interface DatabaseColumn {
  name: string;
  /** 자유 형식 문자열(예: "uuid", "text", "integer", "boolean", "timestamptz") — 특정 DB 방언에
   *  종속되지 않는다. */
  type: string;
  nullable: boolean;
  description: string;
}

export interface DatabaseTable {
  name: string;
  description: string;
  columns: DatabaseColumn[];
  primaryKey: string;
}

export type RelationshipType = "one-to-many" | "many-to-many" | "one-to-one";

export interface DatabaseRelationship {
  from: string;
  to: string;
  type: RelationshipType;
  description: string;
}

export interface DatabaseIndex {
  table: string;
  columns: string[];
  reason: string;
}

export interface RlsPolicy {
  table: string;
  description: string;
}

export interface DatabaseDesignContent {
  tables: DatabaseTable[];
  relationships: DatabaseRelationship[];
  indexes: DatabaseIndex[];
  rlsPolicies: RlsPolicy[];
  migrationNotes: string;
}

export interface DatabaseDesignRecord {
  id: string;
  /** 이 Database Design이 어떤 Design Plan(lib/design/generator.ts) 위에서 생성됐는지. */
  planId: string;
  /** 동일 planId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다(Prototype/Figma와 동일한
   *  버전 관리 관례 — 기존 레코드는 덮어쓰지 않고 히스토리로 보존). */
  version: number;
  content: DatabaseDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-database";

export async function createDatabaseDesign(
  entry: Omit<DatabaseDesignRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseDesignRecord> {
  const records = await store.list<DatabaseDesignRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.planId === entry.planId).length + 1;

  const record: DatabaseDesignRecord = {
    id: generateId("database-design"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listDatabaseDesigns(store: CollectionStore = getDefaultStore()): Promise<DatabaseDesignRecord[]> {
  const records = await store.list<DatabaseDesignRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getDatabaseDesign(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseDesignRecord | null> {
  const records = await store.list<DatabaseDesignRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Design Plan에서 생성된 Database Design만(최신순). */
export async function listDatabaseDesignsForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<DatabaseDesignRecord[]> {
  const records = await listDatabaseDesigns(store);
  return records.filter((record) => record.planId === planId);
}
