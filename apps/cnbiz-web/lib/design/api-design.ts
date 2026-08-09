import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — API Design (AI Business OS 9단계 개발 프로세스의 "05 API").
 * Database Design(lib/design/database-design.ts)이 만든 테이블 구조 위에서 REST API 엔드포인트·
 * 인증 전략·파일 업로드 지점을 AI가 생성한다. 이 파일은 타입 + fs-JSON registry, 생성 로직은
 * api-design-generator.ts에 있다(Database Design과 동일한 파일 분리 관례).
 *
 * 이 산출물은 "AI가 생성한 구조화된 API 설계 문서"다 — 실제 동작하는 Route Handler 코드를
 * 생성하지 않는다(lib/specifications의 기존 apis 필드와 같은 성숙도, 다만 독립된 Phase로
 * 분리되고 버전 관리되어 파이프라인에 연결된다는 점이 다르다).
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  requiresAuth: boolean;
  /** 요청 본문 요약(자유 텍스트) — 본문이 없으면 빈 문자열. */
  requestBody: string;
  responseShape: string;
}

export interface ApiDesignContent {
  endpoints: ApiEndpoint[];
  authenticationStrategy: string;
  /** 파일 업로드가 필요한 엔드포인트 경로 목록(endpoints의 부분집합). */
  fileUploadEndpoints: string[];
  apiTestNotes: string;
}

export interface ApiDesignRecord {
  id: string;
  /** 이 API Design이 어떤 Database Design(lib/design/database-design.ts) 위에서 생성됐는지. */
  databaseDesignId: string;
  /** DatabaseDesignRecord.planId를 그대로 복사(Prototype이 WireframeRecord의 planId를 복사하는 것과 동일한 편의 체인). */
  planId: string;
  /** 동일 databaseDesignId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: ApiDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-api";

export async function createApiDesign(
  entry: Omit<ApiDesignRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<ApiDesignRecord> {
  const records = await store.list<ApiDesignRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.databaseDesignId === entry.databaseDesignId).length + 1;

  const record: ApiDesignRecord = {
    id: generateId("api-design"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listApiDesigns(store: CollectionStore = getDefaultStore()): Promise<ApiDesignRecord[]> {
  const records = await store.list<ApiDesignRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getApiDesign(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ApiDesignRecord | null> {
  const records = await store.list<ApiDesignRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Database Design에서 생성된 API Design만(최신순). */
export async function listApiDesignsForDatabaseDesign(
  databaseDesignId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ApiDesignRecord[]> {
  const records = await listApiDesigns(store);
  return records.filter((record) => record.databaseDesignId === databaseDesignId);
}
