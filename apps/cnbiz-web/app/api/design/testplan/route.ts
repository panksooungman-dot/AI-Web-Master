import { NextResponse } from "next/server";
import { generateTestPlan } from "@/lib/design/testplan-design-generator";
import { createTestPlan, listTestPlans } from "@/lib/design/testplan-design";
import { getBackendDesign } from "@/lib/design/backend-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ testPlans: await listTestPlans() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "07 Test Plan". Backend Design(`backendDesignId`)
 * 위에서 서비스 함수·엔드포인트별 테스트 케이스(Unit/Integration/E2E)를 생성한다(Backend Design과
 * 동일한 패턴: chatViaCli() + 결정론적 폴백, fs-JSON versioned registry). 실제 실행 가능한 테스트
 * 코드를 생성하지 않는다(testplan-design.ts 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const backendDesignId = isRecord(body) && typeof body.backendDesignId === "string" ? body.backendDesignId.trim() : "";

  if (!backendDesignId) {
    return NextResponse.json({ success: false, error: "backendDesignId는 필수입니다." }, { status: 400 });
  }

  const backendDesign = await getBackendDesign(backendDesignId);
  if (!backendDesign) {
    return NextResponse.json(
      { success: false, error: `Backend Design "${backendDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, simulated, provider, model } = await generateTestPlan(backendDesign);
  const record = await createTestPlan({
    backendDesignId,
    planId: backendDesign.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.testplan.generate",
    actor,
    success: true,
    detail: `Test Plan 생성: backendDesignId=${backendDesignId} (테스트 케이스 ${record.content.testCases.length}개)${
      simulated ? " (simulated)" : ""
    }`,
  });
  await incrementMetric("testPlanGenerationCount");

  return NextResponse.json({
    success: true,
    testPlanId: record.id,
    backendDesignId: record.backendDesignId,
    projectId: record.planId,
    testCases: record.content.testCases,
    testPlan: record,
  });
}
