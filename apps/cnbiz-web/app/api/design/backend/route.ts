import { NextResponse } from "next/server";
import { generateBackendDesign } from "@/lib/design/backend-design-generator";
import { createBackendDesign, listBackendDesigns } from "@/lib/design/backend-design";
import { getApiDesign } from "@/lib/design/api-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ backendDesigns: await listBackendDesigns() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "06 Backend". API Design(`apiDesignId`) 위에서 각
 * 엔드포인트의 서비스 함수·검증 규칙·비즈니스 규칙·에러 처리를 생성한다(API Design과 동일한 패턴:
 * chatViaCli() + 결정론적 폴백, fs-JSON versioned registry). 실제 동작하는 서비스 코드를 생성하지
 * 않는다(backend-design.ts 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const apiDesignId = isRecord(body) && typeof body.apiDesignId === "string" ? body.apiDesignId.trim() : "";

  if (!apiDesignId) {
    return NextResponse.json({ success: false, error: "apiDesignId는 필수입니다." }, { status: 400 });
  }

  const apiDesign = await getApiDesign(apiDesignId);
  if (!apiDesign) {
    return NextResponse.json({ success: false, error: `API Design "${apiDesignId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const { content, simulated, provider, model } = await generateBackendDesign(apiDesign);
  const record = await createBackendDesign({
    apiDesignId,
    planId: apiDesign.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.backend.generate",
    actor,
    success: true,
    detail: `Backend Design 생성: apiDesignId=${apiDesignId} (로직 ${record.content.logic.length}개)${
      simulated ? " (simulated)" : ""
    }`,
  });
  await incrementMetric("backendDesignGenerationCount");

  return NextResponse.json({
    success: true,
    backendDesignId: record.id,
    apiDesignId: record.apiDesignId,
    projectId: record.planId,
    logic: record.content.logic,
    backendDesign: record,
  });
}
