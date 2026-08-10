import { chatViaCli, type ChatResult } from "@/lib/ai/bridge";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import type { DesignPlanInput, DesignPlanRecord } from "./types";
import { generateDesignPlan } from "./generator";
import { createDesignPlan } from "./registry";
import { generateDatabaseDesign } from "./database-design-generator";
import { createDatabaseDesign, type DatabaseDesignRecord } from "./database-design";
import { generateApiDesign } from "./api-design-generator";
import { createApiDesign, type ApiDesignRecord } from "./api-design";
import { generateBackendDesign } from "./backend-design-generator";
import { createBackendDesign, type BackendDesignRecord } from "./backend-design";
import { generateBackendCode } from "./backend-code-generator";
import { createBackendCode, type BackendCodeRecord } from "./backend-code";
import { generateApiCode } from "./api-code-generator";
import { createApiCode, type ApiCodeRecord } from "./api-code";
import { generateDatabaseCode } from "./database-code-generator";
import { createDatabaseCode, type DatabaseCodeRecord } from "./database-code";
import { generateTestPlan } from "./testplan-design-generator";
import { createTestPlan, type TestPlanRecord } from "./testplan-design";
import { generateTestCode } from "./test-code-generator";
import { createTestCode, type TestCodeRecord } from "./test-code";
import { generateCrudFrontend } from "./crud-frontend-generator";
import { createCrudFrontend, type CrudFrontendRecord } from "./crud-frontend";
import { AUTO_RUN_BATCH_LIMIT, estimateScope, type ScopeEstimate } from "./scope-check";

/**
 * Design Automation — 9-Stage Orchestrator. 지금까지 AI Business OS의 "9단계 개발 프로세스"
 * (01 Requirements → 04 Database → 05 API → 06 Backend(Design+Code) → 05 API Code →
 * 04 Database Code → 07 Test Plan → 08 Test Code, 그리고 그 확장인 CRUD Frontend)는 사용자가
 * 이전 단계의 산출물 id를 직접 다음 단계 호출에 넘겨가며 10번의 개별 API 호출을 순서대로
 * 실행해야만 완결됐다 — 각 Phase 자체는 완성되어 있었지만 "요구사항 한 번 입력하면 실행
 * 가능한 풀스택 앱까지 자동으로 나온다"는 경험은 없었다. 이 모듈은 그 10개 호출을 하나의
 * 순서대로 실행되는 체인으로 묶는다.
 *
 * 각 단계는 이전 단계의 산출물에 강하게 의존하는 선형 체인이다(Website Build가 Chain B의
 * 존재하지 않는 단계를 조용히 건너뛰는 것과 다르다 — 여기서는 모든 단계가 필수다). 다만
 * 각 generate*() 함수 자체는 이미 AI 실패 시 결정론적 폴백으로 항상 성공하도록 설계되어 있어
 * (chatViaCli() 실패 → simulated:true 폴백), 이 오케스트레이터가 도중에 실패하는 경우는
 * 사실상 registry 쓰기(fs) 실패 같은 예외적 상황뿐이다 — 그런 경우는 그대로 던져 호출자가
 * 처리하게 한다(다른 Phase의 registry 쓰기와 동일하게 조용히 삼키지 않는다).
 *
 * **범위 사전 검증(scope-check) — Multi-Step Workflow 전환**: Database Design·API Design까지
 * 생성한 직후(아직 배치 기반 5개 단계는 시작 전) `estimateScope()`(scope-check.ts)로 남은 단계의
 * 예상 AI 호출(배치) 총합을 계산한다. 이 값이 `AUTO_RUN_BATCH_LIMIT`을 넘으면 — 프로젝트 규모가
 * 커서 이 한 번의 호출 안에서 자동으로 전 구간을 끝까지 실행하기에 적합하지 않다는 뜻이다 — 여기서
 * 멈추고 `completed:false`를 반환한다. 이미 생성된 Database Design/API Design은 그대로 남아있으니
 * 호출자는 그 `apiDesignId`부터 `/api/design/backend` 등 개별 엔드포인트로 나머지를 나눠(multi-step)
 * 진행할 수 있다. `force:true`를 주면 이 검사를 건너뛰고 항상 끝까지 실행한다.
 */
type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

interface CompletedOrchestrationResult {
  completed: true;
  planId: string;
  designPlan: DesignPlanRecord;
  databaseDesign: DatabaseDesignRecord;
  apiDesign: ApiDesignRecord;
  backendDesign: BackendDesignRecord;
  backendCode: BackendCodeRecord;
  apiCode: ApiCodeRecord;
  databaseCode: DatabaseCodeRecord;
  testPlan: TestPlanRecord;
  testCode: TestCodeRecord;
  crudFrontend: CrudFrontendRecord;
  scope: ScopeEstimate;
}

interface ScopeStoppedOrchestrationResult {
  completed: false;
  /** 지금 구조상 항상 "api-design"이다 — 규모를 알 수 있는 시점이 API Design 완료 직후뿐이라서. */
  stoppedAtStage: "api-design";
  reason: string;
  scope: ScopeEstimate;
  planId: string;
  designPlan: DesignPlanRecord;
  databaseDesign: DatabaseDesignRecord;
  apiDesign: ApiDesignRecord;
}

export type OrchestrationResult = CompletedOrchestrationResult | ScopeStoppedOrchestrationResult;

export async function runDesignOrchestration(
  input: DesignPlanInput,
  store: CollectionStore = getDefaultStore(),
  chatFn: ChatFn = chatViaCli,
  force = false
): Promise<OrchestrationResult> {
  const plan = await generateDesignPlan(input, chatFn);
  const designPlan = await createDesignPlan(
    { input, content: plan.content, simulated: plan.simulated, provider: plan.provider, model: plan.model },
    store
  );

  const db = await generateDatabaseDesign(designPlan, chatFn);
  const databaseDesign = await createDatabaseDesign(
    { planId: designPlan.id, content: db.content, simulated: db.simulated, provider: db.provider, model: db.model },
    store
  );

  const api = await generateApiDesign(databaseDesign, chatFn);
  const apiDesign = await createApiDesign(
    {
      databaseDesignId: databaseDesign.id,
      planId: databaseDesign.planId,
      content: api.content,
      simulated: api.simulated,
      provider: api.provider,
      model: api.model,
    },
    store
  );

  const scope = estimateScope(databaseDesign, apiDesign);

  if (!scope.withinAutoRunLimit && !force) {
    return {
      completed: false,
      stoppedAtStage: "api-design",
      reason:
        `테이블 ${scope.tableCount}개·엔드포인트 ${scope.endpointCount}개 규모로, 남은 단계에서 ` +
        `예상 AI 호출이 ${scope.estimatedRemainingBatchCalls}회(자동 실행 권장 상한 ${AUTO_RUN_BATCH_LIMIT}회)` +
        `에 달합니다. apiDesignId="${apiDesign.id}"부터 개별 엔드포인트로 나눠 진행하거나, ` +
        `force:true로 다시 요청해 강행할 수 있습니다.`,
      scope,
      planId: designPlan.id,
      designPlan,
      databaseDesign,
      apiDesign,
    };
  }

  const backend = await generateBackendDesign(apiDesign, chatFn);
  const backendDesign = await createBackendDesign(
    {
      apiDesignId: apiDesign.id,
      planId: apiDesign.planId,
      content: backend.content,
      simulated: backend.simulated,
      provider: backend.provider,
      model: backend.model,
    },
    store
  );

  const backendCodeResult = await generateBackendCode(backendDesign, chatFn);
  const backendCode = await createBackendCode(
    {
      backendDesignId: backendDesign.id,
      planId: backendDesign.planId,
      content: backendCodeResult.content,
      simulated: backendCodeResult.simulated,
      provider: backendCodeResult.provider,
      model: backendCodeResult.model,
    },
    store
  );

  const apiCodeContent = generateApiCode(backendDesign, apiDesign);
  const apiCode = await createApiCode(
    { backendCodeId: backendCode.id, planId: backendCode.planId, content: apiCodeContent },
    store
  );

  const databaseCodeResult = await generateDatabaseCode(databaseDesign, chatFn);
  const databaseCode = await createDatabaseCode(
    {
      databaseDesignId: databaseDesign.id,
      planId: databaseDesign.planId,
      content: databaseCodeResult.content,
      simulated: databaseCodeResult.simulated,
      provider: databaseCodeResult.provider,
      model: databaseCodeResult.model,
    },
    store
  );

  const testPlanResult = await generateTestPlan(backendDesign, chatFn);
  const testPlan = await createTestPlan(
    {
      backendDesignId: backendDesign.id,
      planId: backendDesign.planId,
      content: testPlanResult.content,
      simulated: testPlanResult.simulated,
      provider: testPlanResult.provider,
      model: testPlanResult.model,
    },
    store
  );

  const testCodeResult = await generateTestCode(testPlan, backendDesign, apiDesign, chatFn);
  const testCode = await createTestCode(
    {
      testPlanId: testPlan.id,
      backendCodeId: backendCode.id,
      planId: testPlan.planId,
      content: testCodeResult.content,
      simulated: testCodeResult.simulated,
      provider: testCodeResult.provider,
      model: testCodeResult.model,
    },
    store
  );

  const crudFrontendContent = generateCrudFrontend(backendDesign, databaseDesign);
  const crudFrontend = await createCrudFrontend(
    {
      apiCodeId: apiCode.id,
      databaseDesignId: databaseDesign.id,
      planId: apiCode.planId,
      content: crudFrontendContent,
    },
    store
  );

  return {
    completed: true,
    planId: designPlan.id,
    designPlan,
    databaseDesign,
    apiDesign,
    backendDesign,
    backendCode,
    apiCode,
    databaseCode,
    testPlan,
    testCode,
    crudFrontend,
    scope,
  };
}
