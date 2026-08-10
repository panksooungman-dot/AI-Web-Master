import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — Backend Logic Design (AI Business OS 9단계 개발 프로세스의 "06
 * Backend"). API Design(lib/design/api-design.ts)이 만든 엔드포인트 목록 위에서 각 엔드포인트가
 * 실제로 수행해야 할 서비스 함수·검증 규칙·비즈니스 규칙·에러 처리를 AI가 생성한다. 이 파일은
 * 타입 + fs-JSON registry, 생성 로직은 backend-design-generator.ts에 있다(Database/API Design과
 * 동일한 파일 분리 관례).
 *
 * 이 산출물 자체는 "AI가 생성한 구조화된 백엔드 로직 설계 문서"다(api-design.ts와 동일한 성숙도) —
 * validationRules/businessRules는 사람이 읽는 자연어 문장이라 그 자체로는 실행할 수 없다. 이
 * 텍스트를 실제 컴파일·실행 가능한 TypeScript 함수로 번역하는 다음 단계는
 * lib/design/backend-code{,-generator}.ts(신규)가 담당한다.
 */

export interface BackendLogicEndpoint {
  /** ApiEndpoint.method와 동일한 값(예: "GET", "POST") — api-design.ts의 HttpMethod를 다시
   *  import하지 않고 자유 문자열로 둔다(두 Phase가 서로의 타입에 강하게 결합하지 않도록). */
  method: string;
  path: string;
  /** 이 엔드포인트를 구현하는 서비스 계층 함수 이름(예: "createReservation"). */
  serviceFunction: string;
  validationRules: string[];
  businessRules: string[];
  errorHandling: string[];
}

export interface BackendDesignContent {
  logic: BackendLogicEndpoint[];
  /** 여러 엔드포인트가 공유하는 서비스 모듈(예: "AuthService", "NotificationService"). */
  sharedServices: string[];
  /** 요청-응답 흐름 밖에서 실행되는 작업(cron, queue worker 등). */
  backgroundJobs: string[];
  implementationNotes: string;
}

export interface BackendDesignRecord {
  id: string;
  /** 이 Backend Design이 어떤 API Design(lib/design/api-design.ts) 위에서 생성됐는지. */
  apiDesignId: string;
  /** ApiDesignRecord.planId를 그대로 복사(API Design이 Database Design의 planId를 복사하는 것과
   *  동일한 편의 체인). */
  planId: string;
  /** 동일 apiDesignId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: BackendDesignContent;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-backend";

export async function createBackendDesign(
  entry: Omit<BackendDesignRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<BackendDesignRecord> {
  const records = await store.list<BackendDesignRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.apiDesignId === entry.apiDesignId).length + 1;

  const record: BackendDesignRecord = {
    id: generateId("backend-design"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listBackendDesigns(store: CollectionStore = getDefaultStore()): Promise<BackendDesignRecord[]> {
  const records = await store.list<BackendDesignRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getBackendDesign(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<BackendDesignRecord | null> {
  const records = await store.list<BackendDesignRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 API Design에서 생성된 Backend Design만(최신순). */
export async function listBackendDesignsForApiDesign(
  apiDesignId: string,
  store: CollectionStore = getDefaultStore()
): Promise<BackendDesignRecord[]> {
  const records = await listBackendDesigns(store);
  return records.filter((record) => record.apiDesignId === apiDesignId);
}
