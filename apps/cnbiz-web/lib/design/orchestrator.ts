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
 */
type ChatFn = (message: string, options?: { system?: string; provider?: string }) => Promise<ChatResult>;

export interface OrchestrationResult {
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
}

export async function runDesignOrchestration(
  input: DesignPlanInput,
  store: CollectionStore = getDefaultStore(),
  chatFn: ChatFn = chatViaCli
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
  };
}
