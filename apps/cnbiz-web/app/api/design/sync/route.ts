import { NextResponse } from "next/server";
import { computeSync, type CodeOverrideInput } from "@/lib/design/design-sync-engine";
import { getLatestSyncForReview, listSyncRecords, recordSync, type SyncDirection, type SyncRecord } from "@/lib/design/design-sync";
import { getReview } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { getWireframe } from "@/lib/design/wireframe";
import { listFigmaRecordsForReview } from "@/lib/design/figma";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSyncDirection(value: unknown): value is SyncDirection {
  return value === "design-to-code" || value === "code-to-design";
}

function toResponse(record: SyncRecord) {
  return {
    success: true,
    syncId: record.id,
    projectId: record.planId,
    reviewId: record.reviewId,
    direction: record.direction,
    status: record.status,
    patch: record.patch,
    conflicts: record.conflicts,
    version: record.version,
    sync: record,
  };
}

export async function GET() {
  return NextResponse.json({ syncs: listSyncRecords() });
}

/**
 * `POST /api/design/sync` — Design Automation Phase 8. Phase 3(Wireframe)~7(Figma) 체인을 대상으로
 * Design↔Code 동기화를 실행하고 결과를 영속화한다. `direction:"code-to-design"`에서
 * `codeOverride`를 함께 보내면 코드 쪽 변경을 시뮬레이션해 Conflict Detection을 실제로 트리거할
 * 수 있다(코드 자체가 이 저장소와 연결되어 있지 않은 이유는
 * docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 10번 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const reviewId = isRecord(body) && typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  const direction = isRecord(body) ? body.direction : undefined;
  const codeOverride = isRecord(body) && isRecord(body.codeOverride) ? (body.codeOverride as CodeOverrideInput) : null;
  const note = isRecord(body) && typeof body.note === "string" ? body.note : undefined;

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  if (!isSyncDirection(direction)) {
    return NextResponse.json(
      { success: false, error: 'direction은 "design-to-code"|"code-to-design" 중 하나여야 합니다.' },
      { status: 400 }
    );
  }

  const review = await getReview(reviewId);
  if (!review) {
    return NextResponse.json({ success: false, error: `Review "${reviewId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const claudeDesign = await getClaudeDesign(review.claudeDesignId);
  if (!claudeDesign) {
    return NextResponse.json(
      { success: false, error: `Claude Design "${review.claudeDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const prototype = await getPrototype(claudeDesign.prototypeId);
  if (!prototype) {
    return NextResponse.json(
      { success: false, error: `Prototype "${claudeDesign.prototypeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const wireframe = await getWireframe(prototype.wireframeId);
  if (!wireframe) {
    return NextResponse.json(
      { success: false, error: `Wireframe "${prototype.wireframeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const figma = (await listFigmaRecordsForReview(reviewId))[0] ?? null;
  const previous = getLatestSyncForReview(reviewId);
  const actor = await getCurrentActorEmail();

  await recordAuditEvent({
    action: "design.sync.start",
    actor,
    success: true,
    detail: `Design Sync 시작: Review "${reviewId}" (${direction})`,
  });

  const result = computeSync({ direction, wireframe, figma, previous, codeOverride });

  const record = recordSync({
    reviewId,
    planId: review.planId,
    figmaId: figma?.id ?? null,
    direction,
    designSnapshot: result.designSnapshot,
    codeSnapshot: result.codeSnapshot,
    patch: result.patch,
    conflicts: result.conflicts,
    status: result.status,
    actor,
    note,
  });

  await incrementMetric("designSyncCount");

  if (result.status === "conflict") {
    await recordAuditEvent({
      action: "design.sync.conflict",
      actor,
      success: true,
      detail: `Design Sync 충돌 감지: Review "${reviewId}" (${result.conflicts.length}건)`,
    });
    await incrementMetric("conflictCount");
  } else {
    await recordAuditEvent({
      action: "design.sync.complete",
      actor,
      success: true,
      detail: `Design Sync 완료: Review "${reviewId}" v${record.version}`,
    });
  }

  return NextResponse.json(toResponse(record));
}
