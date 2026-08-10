import { NextResponse } from "next/server";
import { generateApiCode } from "@/lib/design/api-code-generator";
import { createApiCode, listApiCodes } from "@/lib/design/api-code";
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
  return NextResponse.json({ apiCodes: await listApiCodes() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "05 API 설계/구현"을 실제 코드 산출물까지 완성하는
 * 단계. Backend Code(`backendCodeId`)가 실제로 존재함을 확인한 뒤, 그 체인을 거슬러 올라가
 * Backend Design(serviceFunction 이름)과 API Design(requiresAuth)을 함께 조회해 Next.js Route
 * Handler를 생성한다(api-code-generator.ts 참고). 다른 Design Automation Phase와 달리 AI를
 * 호출하지 않는다 — 순수한 기계적 변환이다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const backendCodeId = isRecord(body) && typeof body.backendCodeId === "string" ? body.backendCodeId.trim() : "";

  if (!backendCodeId) {
    return NextResponse.json({ success: false, error: "backendCodeId는 필수입니다." }, { status: 400 });
  }

  const backendCode = await getBackendCode(backendCodeId);
  if (!backendCode) {
    return NextResponse.json(
      { success: false, error: `Backend Code "${backendCodeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const backendDesign = await getBackendDesign(backendCode.backendDesignId);
  if (!backendDesign) {
    return NextResponse.json(
      { success: false, error: `Backend Design "${backendCode.backendDesignId}"을(를) 찾을 수 없습니다.` },
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

  const content = generateApiCode(backendDesign, apiDesign);
  const record = await createApiCode({ backendCodeId, planId: backendCode.planId, content });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.api-code.generate",
    actor,
    success: true,
    detail: `API Code 생성: backendCodeId=${backendCodeId} (파일 ${record.content.files.length}개)`,
  });
  await incrementMetric("apiCodeGenerationCount");

  return NextResponse.json({
    success: true,
    apiCodeId: record.id,
    backendCodeId: record.backendCodeId,
    projectId: record.planId,
    files: record.content.files,
    apiCode: record,
  });
}
