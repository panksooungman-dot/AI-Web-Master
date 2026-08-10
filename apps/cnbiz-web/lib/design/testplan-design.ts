import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation Extension — Test Plan Design (AI Business OS 9단계 개발 프로세스의 "07 Test
 * Plan"). Backend Design(lib/design/backend-design.ts)이 만든 서비스 로직 위에서 각 로직·엔드포인트를
 * 검증할 테스트 케이스(Unit/Integration/E2E)를 AI가 생성한다. 이 파일은 타입 + fs-JSON registry,
 * 생성 로직은 testplan-design-generator.ts에 있다(Database/API/Backend Design과 동일한 파일 분리
 * 관례).
 *
 * 이 산출물은 "AI가 생성한 구조화된 테스트 계획 문서"다 — 실제 실행 가능한 테스트 코드를 생성하지
 * 않는다(backend-design.ts와 동일한 성숙도).
 */

export type TestCaseType = "unit" | "integration" | "e2e";

export interface TestCase {
  /** 사람이 읽는 순번(예: "TC-001") — 전역 유일성은 보장하지 않으며 표시 목적만 있다. */
  id: string;
  title: string;
  type: TestCaseType;
  /** 이 테스트가 검증하는 대상(서비스 함수명 또는 "METHOD /path"). */
  target: string;
  steps: string[];
  expectedResult: string;
}

export interface TestPlanContent {
  testCases: TestCase[];
  coverageSummary: string;
  priorityNotes: string;
}

export interface TestPlanRecord {
  id: string;
  /** 이 Test Plan이 어떤 Backend Design(lib/design/backend-design.ts) 위에서 생성됐는지. */
  backendDesignId: string;
  /** BackendDesignRecord.planId를 그대로 복사(Backend Design이 API Design의 planId를 복사하는
   *  것과 동일한 편의 체인). */
  planId: string;
  /** 동일 backendDesignId에 대해 다시 생성하면 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  content: TestPlanContent;
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-testplan";

export async function createTestPlan(
  entry: Omit<TestPlanRecord, "id" | "createdAt" | "version"> & { version?: number },
  store: CollectionStore = getDefaultStore()
): Promise<TestPlanRecord> {
  const records = await store.list<TestPlanRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.backendDesignId === entry.backendDesignId).length + 1;

  const record: TestPlanRecord = {
    id: generateId("test-plan"),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listTestPlans(store: CollectionStore = getDefaultStore()): Promise<TestPlanRecord[]> {
  const records = await store.list<TestPlanRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getTestPlan(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<TestPlanRecord | null> {
  const records = await store.list<TestPlanRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Backend Design에서 생성된 Test Plan만(최신순). */
export async function listTestPlansForBackendDesign(
  backendDesignId: string,
  store: CollectionStore = getDefaultStore()
): Promise<TestPlanRecord[]> {
  const records = await listTestPlans(store);
  return records.filter((record) => record.backendDesignId === backendDesignId);
}
