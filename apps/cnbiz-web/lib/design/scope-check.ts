import type { DatabaseDesignRecord } from "./database-design";
import type { ApiDesignRecord } from "./api-design";
import { BACKEND_DESIGN_BATCH_SIZE } from "./backend-design-generator";
import { BACKEND_CODE_BATCH_SIZE } from "./backend-code-generator";
import { DATABASE_CODE_RLS_BATCH_SIZE } from "./database-code-generator";
import { TESTPLAN_BATCH_SIZE } from "./testplan-design-generator";
import { TEST_CODE_BATCH_SIZE } from "./test-code-generator";

/**
 * 9-Stage Orchestrator — 사전 범위 검증. Database Design 이전에는 프로젝트 규모(테이블/엔드포인트
 * 수)를 전혀 알 수 없다(자유 텍스트 requirements만 있음) — 그래서 이 검사는 orchestrator.ts가
 * Database Design·API Design까지 실제로 생성한 "직후"(아직 배치 기반 단계는 시작 전)에 수행된다.
 *
 * 각 배치 기반 단계(Backend Design/Code·Database Code·Test Plan/Code)는 이미 배치 병렬 호출로
 * "전부 폴백"은 막아냈지만(2026-08-10, 엔드포인트 63개 재현·수정), 배치 자체의 *개수*는 줄이지
 * 않는다 — 프로젝트가 크면 이 오케스트레이터 한 번의 HTTP 요청 안에서 수십 개의 AI 호출이 순서대로
 * 이어지며, 그만큼 총 소요 시간·비용이 커진다. 이 모듈은 그 규모를 실제 생성된 산출물 기준으로
 * 정확히 추정해, 너무 크면 오케스트레이터가 자동으로 전 구간을 실행하는 대신 API Design까지만
 * 완료한 상태로 멈추고 "이후는 개별 엔드포인트로 나눠 진행하라"고 안내할 수 있게 한다(multi-step
 * workflow로의 전환) — `force:true`로 이 안내를 무시하고 강행할 수도 있다.
 */

/** 남은 5개 배치 기반 단계 전체에서 예상되는 AI 호출(배치) 총합이 이 값을 넘으면 자동 실행을
 *  권장하지 않는다. 두 실측값 사이에서 잡았다 — (1) 결정론적 기본 폴백(Design Plan이 항상 만드는
 *  feature 4개 → 테이블 5개·엔드포인트 20개)만으로도 이미 18회가 나온다(이 정도는 명백히 "작은
 *  프로젝트"이므로 반드시 자동 실행 범위 안에 들어야 한다), (2) 2026-08-10 실 E2E에서 실제로 문제가
 *  됐던 엔드포인트 53개·테이블 14개 규모는 5개 단계 전체를 합치면 약 48회로, 이 정도부터는 한 번의
 *  HTTP 요청 안에서 자동으로 끝까지 도는 대신 multi-step으로 나누는 편이 안전하다고 판단했다. */
export const AUTO_RUN_BATCH_LIMIT = 40;

export interface ScopeEstimate {
  tableCount: number;
  endpointCount: number;
  /** Backend Design/Code·Database Code·Test Plan/Code 5개 단계에서 예상되는 AI 호출(배치) 총합. */
  estimatedRemainingBatchCalls: number;
  /** estimatedRemainingBatchCalls <= AUTO_RUN_BATCH_LIMIT. */
  withinAutoRunLimit: boolean;
}

/**
 * Database Design·API Design이 실제로 생성된 뒤 호출한다. 이후 단계(Backend Design 등)의 배치
 * 개수는 그 단계가 실제로 실행되기 전까지는 정확히 알 수 없으므로(로직/테스트 케이스 수는 AI가
 * 만들기 전까지 확정되지 않음) 아래 두 가지 결정론적 관계로 근사한다 — 둘 다 각 단계의 실제
 * 결정론적 폴백 생성기(backend-design-generator.ts의 buildDefaultLogicEntry() 등)가 항상 지키는
 * 관계이며, AI 경로에서도 시스템 프롬프트가 "엔드포인트당 정확히 1개 로직"·"로직당 정확히
 * unit+integration 각 1개"를 명시하므로 근사가 아니라 사실상 정확한 값이다.
 *   - Backend Design의 로직 개수 = API Design의 엔드포인트 개수 (1:1)
 *   - Test Plan의 테스트 케이스 개수 = 로직 개수 × 2 (unit + integration)
 *   - Database Code의 RLS Policy 개수 = Database Design의 테이블 개수 (1:1)
 */
export function estimateScope(databaseDesign: DatabaseDesignRecord, apiDesign: ApiDesignRecord): ScopeEstimate {
  const tableCount = databaseDesign.content.tables.length;
  const endpointCount = apiDesign.content.endpoints.length;
  const logicCount = endpointCount;
  const testCaseCount = logicCount * 2;

  const estimatedRemainingBatchCalls =
    Math.ceil(endpointCount / BACKEND_DESIGN_BATCH_SIZE) +
    Math.ceil(logicCount / BACKEND_CODE_BATCH_SIZE) +
    Math.ceil(tableCount / DATABASE_CODE_RLS_BATCH_SIZE) +
    Math.ceil(logicCount / TESTPLAN_BATCH_SIZE) +
    Math.ceil(testCaseCount / TEST_CODE_BATCH_SIZE);

  return {
    tableCount,
    endpointCount,
    estimatedRemainingBatchCalls,
    withinAutoRunLimit: estimatedRemainingBatchCalls <= AUTO_RUN_BATCH_LIMIT,
  };
}
