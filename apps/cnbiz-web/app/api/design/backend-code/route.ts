import { NextResponse } from "next/server";
import { generateBackendCode } from "@/lib/design/backend-code-generator";
import { createBackendCode, listBackendCodes } from "@/lib/design/backend-code";
import { getBackendDesign } from "@/lib/design/backend-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ backendCodes: await listBackendCodes() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "06 개발(Backend)"을 실제 코드 산출물까지 완성하는
 * 단계. Backend Design(`backendDesignId`)의 서비스 함수명·자연어 검증/비즈니스 규칙을 실제
 * 컴파일·실행 가능한 TypeScript 코드로 번역한다(chatViaCli() 배치 병렬 호출 + 결정론적 CRUD
 * 폴백, fs-JSON versioned registry — Backend Design과 동일한 배치 패턴). 다른 Design Automation
 * Phase(설계 문서만 생성)와 달리 이 Phase의 산출물은 그대로 파일로 저장하면 컴파일되는 실제
 * 소스 코드다(backend-code.ts 참고).
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

  const { content, simulated, provider, model } = await generateBackendCode(backendDesign);
  const record = await createBackendCode({
    backendDesignId,
    planId: backendDesign.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.backend-code.generate",
    actor,
    success: true,
    detail: `Backend Code 생성: backendDesignId=${backendDesignId} (파일 ${record.content.files.length}개)${
      simulated ? " (simulated)" : ""
    }`,
  });
  await incrementMetric("backendCodeGenerationCount");

  return NextResponse.json({
    success: true,
    backendCodeId: record.id,
    backendDesignId: record.backendDesignId,
    projectId: record.planId,
    files: record.content.files,
    backendCode: record,
  });
}
