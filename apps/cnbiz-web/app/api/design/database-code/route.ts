import { NextResponse } from "next/server";
import { generateDatabaseCode } from "@/lib/design/database-code-generator";
import { createDatabaseCode, listDatabaseCodes } from "@/lib/design/database-code";
import { getDatabaseDesign } from "@/lib/design/database-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ databaseCodes: await listDatabaseCodes() });
}

/**
 * AI Business OS 9단계 개발 프로세스 확장 — "04 DB 설계"를 실제 실행 가능한 SQL 마이그레이션까지
 * 완성하는 단계. Database Design(`databaseDesignId`)의 Table/Relationship/Index는 결정론적으로,
 * RLS Policy(자연어 문장)는 chatViaCli() 배치 병렬 호출로 실제 Supabase Postgres SQL로 번역한다
 * (database-code-generator.ts 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const databaseDesignId = isRecord(body) && typeof body.databaseDesignId === "string" ? body.databaseDesignId.trim() : "";

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

  const { content, simulated, provider, model } = await generateDatabaseCode(databaseDesign);
  const record = await createDatabaseCode({
    databaseDesignId,
    planId: databaseDesign.planId,
    content,
    simulated,
    provider,
    model,
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.database-code.generate",
    actor,
    success: true,
    detail: `Database Code 생성: databaseDesignId=${databaseDesignId} (파일 ${record.content.files.length}개)${
      simulated ? " (simulated)" : ""
    }`,
  });
  await incrementMetric("databaseCodeGenerationCount");

  return NextResponse.json({
    success: true,
    databaseCodeId: record.id,
    databaseDesignId: record.databaseDesignId,
    projectId: record.planId,
    files: record.content.files,
    databaseCode: record,
  });
}
