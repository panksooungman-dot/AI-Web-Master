import { NextResponse } from "next/server";
import { generateTestCode } from "@/lib/design/test-code-generator";
import { createTestCode, listTestCodes } from "@/lib/design/test-code";
import { getTestPlan } from "@/lib/design/testplan-design";
import { getBackendCode } from "@/lib/design/backend-code";
import { getBackendDesign } from "@/lib/design/backend-design";
import { getApiDesign } from "@/lib/design/api-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ testCodes: await listTestCodes() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "08 테스트"를 실제 실행 가능한 Vitest 테스트
 * 코드까지 완성하는 단계. Test Plan(`testPlanId`)의 자연어 테스트 케이스를, Backend
 * Code(`backendCodeId`)가 실제로 존재함을 확인한 뒤 그 서비스 함수를 대상으로 검증하는 실제
 * 테스트로 번역한다(chatViaCli() 배치 병렬 호출 + 결정론적 placeholder 폴백,
 * test-code-generator.ts 참고). backendCodeId는 자동으로 유추하지 않고 명시적으로 받는다 —
 * 동일 backendDesignId에 여러 버전의 Backend Code가 있을 수 있어 "어느 버전을 대상으로
 * 테스트를 작성할지"는 호출자가 정해야 한다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const testPlanId = isRecord(body) && typeof body.testPlanId === "string" ? body.testPlanId.trim() : "";
  const backendCodeId = isRecord(body) && typeof body.backendCodeId === "string" ? body.backendCodeId.trim() : "";

  if (!testPlanId) {
    return NextResponse.json({ success: false, error: "testPlanId는 필수입니다." }, { status: 400 });
  }
  if (!backendCodeId) {
    return NextResponse.json({ success: false, error: "backendCodeId는 필수입니다." }, { status: 400 });
  }

  const testPlan = await getTestPlan(testPlanId);
  if (!testPlan) {
    return NextResponse.json({ success: false, error: `Test Plan "${testPlanId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const backendCode = await getBackendCode(backendCodeId);
  if (!backendCode) {
    return NextResponse.json(
      { success: false, error: `Backend Code "${backendCodeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  if (backendCode.backendDesignId !== testPlan.backendDesignId) {
    return NextResponse.json(
      {
        success: false,
        error: `Backend Code "${backendCodeId}"는 Test Plan "${testPlanId}"와 다른 Backend Design에서 생성되었습니다.`,
      },
      { status: 400 }
    );
  }

  const backendDesign = await getBackendDesign(testPlan.backendDesignId);
  if (!backendDesign) {
    return NextResponse.json(
      { success: false, error: `Backend Design "${testPlan.backendDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const apiDesign = await getApiDesign(backendDesign.apiDesignId);
  if (!apiDesign) {
    return NextResponse.json(
      { success: false, error: `API Design "${backendDesign.apiDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, simulated, provider, model } = await generateTestCode(testPlan, backendDesign, apiDesign);
  const record = await createTestCode({
    testPlanId,
    backendCodeId,
    planId: testPlan.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.test-code.generate",
    actor,
    success: true,
    detail: `Test Code 생성: testPlanId=${testPlanId} (파일 ${record.content.files.length}개)${
      simulated ? " (simulated)" : ""
    }`,
  });
  await incrementMetric("testCodeGenerationCount");

  return NextResponse.json({
    success: true,
    testCodeId: record.id,
    testPlanId: record.testPlanId,
    backendCodeId: record.backendCodeId,
    projectId: record.planId,
    files: record.content.files,
    testCode: record,
  });
}
