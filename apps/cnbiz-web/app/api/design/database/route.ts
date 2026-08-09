import { NextResponse } from "next/server";
import { generateDatabaseDesign } from "@/lib/design/database-design-generator";
import { createDatabaseDesign, listDatabaseDesigns } from "@/lib/design/database-design";
import { getDesignPlan } from "@/lib/design/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ databaseDesigns: await listDatabaseDesigns() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "04 Database". Phase 1의 DesignPlanRecord(`planId`)
 * 위에서 ERD/Table/Relationship/Index/RLS Policy를 생성한다(Phase 2~9와 동일한 패턴: chatViaCli()
 * + 결정론적 폴백, fs-JSON versioned registry). 이 산출물은 AI가 생성한 구조화된 설계 문서이며,
 * 실제 SQL 마이그레이션을 실행하거나 진짜 데이터베이스에 반영하지 않는다(database-design.ts 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const planId = isRecord(body) && typeof body.planId === "string" ? body.planId.trim() : "";

  if (!planId) {
    return NextResponse.json({ success: false, error: "planId는 필수입니다." }, { status: 400 });
  }

  const plan = await getDesignPlan(planId);
  if (!plan) {
    return NextResponse.json({ success: false, error: `Design Plan "${planId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const { content, simulated, provider, model } = await generateDatabaseDesign(plan);
  const record = await createDatabaseDesign({ planId, content, simulated, provider, model });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.database.generate",
    actor,
    success: true,
    detail: `Database Design 생성: "${plan.input.projectName}" (테이블 ${record.content.tables.length}개)${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("databaseDesignGenerationCount");

  return NextResponse.json({
    success: true,
    databaseDesignId: record.id,
    projectId: record.planId,
    tables: record.content.tables,
    relationships: record.content.relationships,
    databaseDesign: record,
  });
}
