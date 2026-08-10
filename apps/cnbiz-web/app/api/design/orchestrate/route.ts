import { NextResponse } from "next/server";
import { runDesignOrchestration } from "@/lib/design/orchestrator";
import type { DesignPlanInput } from "@/lib/design/types";
import { recordAuditEvent, type AuditAction } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric, type MetricsCounters } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string).trim() : "";
}

/**
 * Design Automation — 9-Stage Orchestrator. `POST /api/design/requirements`부터
 * `POST /api/design/crud-frontend`까지 10개 산출물(01 Design Plan → 04 Database Design →
 * 05 API Design → 06 Backend Design → 06 Backend Code → 05 API Code → 04 Database Code →
 * 07 Test Plan → 08 Test Code → CRUD Frontend)을 한 번의 요청으로 순서대로 생성한다
 * (lib/design/orchestrator.ts 참고). 각 단계는 개별 라우트(`/api/design/database` 등)를 그대로
 * 호출했을 때와 동일한 Audit Log 액션·Metrics 카운터를 기록한다 — Dashboard·Audit Log·Metrics는
 * 어떤 경로로 생성됐는지 구분하지 않고 동일하게 집계되어야 하기 때문이다. `design.orchestrate.run`
 * 은 그 10개와 별개로 "전체 체인을 한 번에 실행했다"는 사실 자체를 추가로 기록한다.
 *
 * **범위가 크면 API Design에서 멈춘다**: `runDesignOrchestration()`이 Database Design·API
 * Design 생성 직후 규모를 추정해(lib/design/scope-check.ts), 남은 5개 배치 기반 단계의 예상 AI
 * 호출이 너무 많으면 `completed:false`를 반환한다 — 이 경우 이미 생성된 2개 단계의 Audit/
 * Metrics만 기록하고, `design.orchestrate.run` 대신 `design.orchestrate.scope_stop`을 기록한다.
 * `force:true`를 body에 담아 다시 요청하면 이 검사를 건너뛰고 강행한다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const projectName = str(body, "projectName");
  const projectType = str(body, "projectType");
  const requirements = str(body, "requirements");
  const targetUsers = str(body, "targetUsers");
  const projectId = str(body, "projectId") || undefined;
  const force = body.force === true;

  if (!projectName || !requirements) {
    return NextResponse.json(
      { success: false, error: "projectName·requirements는 필수입니다." },
      { status: 400 }
    );
  }

  const input: DesignPlanInput = { projectName, projectType, requirements, targetUsers, projectId };
  const result = await runDesignOrchestration(input, undefined, undefined, force);
  const actor = await getCurrentActorEmail();

  // Database Design·API Design은 completed 여부와 무관하게 항상 생성되므로, 두 단계의
  // Audit/Metrics는 completed:false일 때도 그대로 기록한다 — 실제로 만들어진 산출물이기 때문이다.
  const stages: { action: AuditAction; metric: keyof MetricsCounters; detail: string }[] = [
    {
      action: "design.generate",
      metric: "aiTaskCount",
      detail: `Design Plan 생성: "${projectName}"${result.designPlan.simulated ? " (simulated)" : ""}`,
    },
    {
      action: "design.database.generate",
      metric: "databaseDesignGenerationCount",
      detail: `Database Design 생성: "${projectName}" (테이블 ${result.databaseDesign.content.tables.length}개)${
        result.databaseDesign.simulated ? " (simulated)" : ""
      }`,
    },
    {
      action: "design.api.generate",
      metric: "apiDesignGenerationCount",
      detail: `API Design 생성: databaseDesignId=${result.databaseDesign.id} (엔드포인트 ${
        result.apiDesign.content.endpoints.length
      }개)${result.apiDesign.simulated ? " (simulated)" : ""}`,
    },
  ];

  if (result.completed) {
    stages.push(
      {
        action: "design.backend.generate",
        metric: "backendDesignGenerationCount",
        detail: `Backend Design 생성: apiDesignId=${result.apiDesign.id} (로직 ${
          result.backendDesign.content.logic.length
        }개)${result.backendDesign.simulated ? " (simulated)" : ""}`,
      },
      {
        action: "design.backend-code.generate",
        metric: "backendCodeGenerationCount",
        detail: `Backend Code 생성: backendDesignId=${result.backendDesign.id} (파일 ${
          result.backendCode.content.files.length
        }개)${result.backendCode.simulated ? " (simulated)" : ""}`,
      },
      {
        action: "design.api-code.generate",
        metric: "apiCodeGenerationCount",
        detail: `API Code 생성: backendCodeId=${result.backendCode.id} (파일 ${result.apiCode.content.files.length}개)`,
      },
      {
        action: "design.database-code.generate",
        metric: "databaseCodeGenerationCount",
        detail: `Database Code 생성: databaseDesignId=${result.databaseDesign.id} (파일 ${
          result.databaseCode.content.files.length
        }개)${result.databaseCode.simulated ? " (simulated)" : ""}`,
      },
      {
        action: "design.testplan.generate",
        metric: "testPlanGenerationCount",
        detail: `Test Plan 생성: backendDesignId=${result.backendDesign.id} (테스트 케이스 ${
          result.testPlan.content.testCases.length
        }개)${result.testPlan.simulated ? " (simulated)" : ""}`,
      },
      {
        action: "design.test-code.generate",
        metric: "testCodeGenerationCount",
        detail: `Test Code 생성: testPlanId=${result.testPlan.id} (파일 ${result.testCode.content.files.length}개)${
          result.testCode.simulated ? " (simulated)" : ""
        }`,
      },
      {
        action: "design.crud-frontend.generate",
        metric: "crudFrontendGenerationCount",
        detail: `CRUD Frontend 생성: apiCodeId=${result.apiCode.id} (파일 ${result.crudFrontend.content.files.length}개)`,
      }
    );
  }

  for (const stage of stages) {
    await recordAuditEvent({ action: stage.action, actor, success: true, detail: stage.detail });
    await incrementMetric(stage.metric);
  }

  if (!result.completed) {
    await recordAuditEvent({
      action: "design.orchestrate.scope_stop",
      actor,
      success: true,
      detail: `9-Stage 자동 생성 범위 초과로 중단: "${projectName}" (${result.reason})`,
    });
    await incrementMetric("orchestrationScopeStopCount");

    return NextResponse.json({
      success: true,
      completed: false,
      stoppedAtStage: result.stoppedAtStage,
      reason: result.reason,
      scope: result.scope,
      planId: result.planId,
      databaseDesignId: result.databaseDesign.id,
      apiDesignId: result.apiDesign.id,
      result,
    });
  }

  const totalFiles =
    result.backendCode.content.files.length +
    result.apiCode.content.files.length +
    result.databaseCode.content.files.length +
    result.testCode.content.files.length +
    result.crudFrontend.content.files.length;
  const anySimulated = [
    result.designPlan.simulated,
    result.databaseDesign.simulated,
    result.apiDesign.simulated,
    result.backendDesign.simulated,
    result.backendCode.simulated,
    result.databaseCode.simulated,
    result.testPlan.simulated,
    result.testCode.simulated,
  ].some(Boolean);

  await recordAuditEvent({
    action: "design.orchestrate.run",
    actor,
    success: true,
    detail: `9-Stage 자동 생성 완료: "${projectName}" (Plan→Database→API→Backend(Design+Code)→API Code→Database Code→Test Plan→Test Code→CRUD Frontend, 총 파일 ${totalFiles}개)${
      anySimulated ? " (일부 simulated)" : ""
    }`,
  });
  await incrementMetric("orchestrationRunCount");

  return NextResponse.json({
    success: true,
    completed: true,
    planId: result.planId,
    databaseDesignId: result.databaseDesign.id,
    apiDesignId: result.apiDesign.id,
    backendDesignId: result.backendDesign.id,
    backendCodeId: result.backendCode.id,
    apiCodeId: result.apiCode.id,
    databaseCodeId: result.databaseCode.id,
    testPlanId: result.testPlan.id,
    testCodeId: result.testCode.id,
    crudFrontendId: result.crudFrontend.id,
    scope: result.scope,
    totalFiles,
    result,
  });
}
