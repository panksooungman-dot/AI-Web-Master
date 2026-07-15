import { NextResponse } from "next/server";
import { rollbackSyncRecord } from "@/lib/design/design-sync";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * `POST /api/design/sync/rollback` — Design Automation Phase 8. 지정한 `syncId`의 과거 버전
 * (`toVersion`)으로 designSnapshot/codeSnapshot을 되돌린다. 히스토리는 지우지 않고 새 항목으로
 * 추가된다(append-only, Phase 6 Review Engine과 동일한 원칙).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const syncId = isRecord(body) && typeof body.syncId === "string" ? body.syncId.trim() : "";
  const toVersion = isRecord(body) && typeof body.toVersion === "number" ? body.toVersion : NaN;
  const note = isRecord(body) && typeof body.note === "string" ? body.note : undefined;

  if (!syncId) {
    return NextResponse.json({ success: false, error: "syncId는 필수입니다." }, { status: 400 });
  }

  if (!Number.isFinite(toVersion)) {
    return NextResponse.json({ success: false, error: "toVersion은 숫자여야 합니다." }, { status: 400 });
  }

  const actor = await getCurrentActorEmail();
  const result = rollbackSyncRecord(syncId, toVersion, { actor, note });

  if (!result.success || !result.record) {
    const status = result.errorCode === "not_found" ? 404 : 400;
    return NextResponse.json({ success: false, error: result.error }, { status });
  }

  recordAuditEvent({
    action: "design.sync.rollback",
    actor,
    success: true,
    detail: `Design Sync 롤백: "${syncId}" → v${toVersion}`,
  });
  incrementMetric("rollbackCount");

  return NextResponse.json({
    success: true,
    syncId: result.record.id,
    projectId: result.record.planId,
    reviewId: result.record.reviewId,
    direction: result.record.direction,
    status: result.record.status,
    patch: result.record.patch,
    conflicts: result.record.conflicts,
    version: result.record.version,
    sync: result.record,
  });
}
