import { NextResponse } from "next/server";
import { generateCrudFrontend } from "@/lib/design/crud-frontend-generator";
import { createCrudFrontend, listCrudFrontends } from "@/lib/design/crud-frontend";
import { getApiCode } from "@/lib/design/api-code";
import { getBackendCode } from "@/lib/design/backend-code";
import { getBackendDesign } from "@/lib/design/backend-design";
import { getApiDesign } from "@/lib/design/api-design";
import { getDatabaseDesign } from "@/lib/design/database-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ crudFrontends: await listCrudFrontends() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "07 디자인 코딩(Frontend)"을 Chain B 위에서 실제로
 * 백엔드를 호출하는 화면까지 완성하는 단계. API Code(`apiCodeId`)가 실제로 존재함을 확인한 뒤,
 * 그 체인을 거슬러 올라가 Backend Design(serviceFunction 이름)과 Database Design(컬럼 정보)을
 * 함께 조회해 리소스마다 목록·등록·수정 화면을 생성한다(crud-frontend-generator.ts 참고). API
 * Code와 마찬가지로 AI를 호출하지 않는다 — 순수한 기계적 변환이다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const apiCodeId = isRecord(body) && typeof body.apiCodeId === "string" ? body.apiCodeId.trim() : "";

  if (!apiCodeId) {
    return NextResponse.json({ success: false, error: "apiCodeId는 필수입니다." }, { status: 400 });
  }

  const apiCode = await getApiCode(apiCodeId);
  if (!apiCode) {
    return NextResponse.json({ success: false, error: `API Code "${apiCodeId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const backendCode = await getBackendCode(apiCode.backendCodeId);
  if (!backendCode) {
    return NextResponse.json(
      { success: false, error: `Backend Code "${apiCode.backendCodeId}"을(를) 찾을 수 없습니다.` },
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

  const databaseDesign = await getDatabaseDesign(apiDesign.databaseDesignId);
  if (!databaseDesign) {
    return NextResponse.json(
      { success: false, error: `Database Design "${apiDesign.databaseDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const content = generateCrudFrontend(backendDesign, databaseDesign);
  const record = await createCrudFrontend({
    apiCodeId,
    databaseDesignId: databaseDesign.id,
    planId: apiCode.planId,
    content,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.crud-frontend.generate",
    actor,
    success: true,
    detail: `CRUD Frontend 생성: apiCodeId=${apiCodeId} (파일 ${record.content.files.length}개)`,
  });
  await incrementMetric("crudFrontendGenerationCount");

  return NextResponse.json({
    success: true,
    crudFrontendId: record.id,
    apiCodeId: record.apiCodeId,
    projectId: record.planId,
    files: record.content.files,
    crudFrontend: record,
  });
}
