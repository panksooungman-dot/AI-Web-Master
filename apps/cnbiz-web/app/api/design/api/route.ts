import { NextResponse } from "next/server";
import { generateApiDesign } from "@/lib/design/api-design-generator";
import { createApiDesign, listApiDesigns } from "@/lib/design/api-design";
import { getDatabaseDesign } from "@/lib/design/database-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ apiDesigns: await listApiDesigns() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "05 API". Database Design(`databaseDesignId`) 위에서
 * REST 엔드포인트/인증 전략/파일 업로드 지점을 생성한다(Database Design과 동일한 패턴:
 * chatViaCli() + 결정론적 폴백, fs-JSON versioned registry). 실제 동작하는 Route Handler 코드를
 * 생성하지 않는다(api-design.ts 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const databaseDesignId =
    isRecord(body) && typeof body.databaseDesignId === "string" ? body.databaseDesignId.trim() : "";

  if (!databaseDesignId) {
    return NextResponse.json({ success: false, error: "databaseDesignId는 필수입니다." }, { status: 400 });
  }

  const databaseDesign = await getDatabaseDesign(databaseDesignId);
  if (!databaseDesign) {
    return NextResponse.json(
      { success: false, error: `Database Design "${databaseDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, simulated, provider, model } = await generateApiDesign(databaseDesign);
  const record = await createApiDesign({
    databaseDesignId,
    planId: databaseDesign.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.api.generate",
    actor,
    success: true,
    detail: `API Design 생성: databaseDesignId=${databaseDesignId} (엔드포인트 ${record.content.endpoints.length}개)${
      simulated ? " (simulated)" : ""
    }`,
  });
  await incrementMetric("apiDesignGenerationCount");

  return NextResponse.json({
    success: true,
    apiDesignId: record.id,
    databaseDesignId: record.databaseDesignId,
    projectId: record.planId,
    endpoints: record.content.endpoints,
    apiDesign: record,
  });
}
