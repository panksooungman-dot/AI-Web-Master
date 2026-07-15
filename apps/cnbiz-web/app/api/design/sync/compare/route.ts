import { NextResponse } from "next/server";
import { computeSync, type CodeOverrideInput } from "@/lib/design/design-sync-engine";
import { getLatestSyncForReview, type SyncDirection } from "@/lib/design/design-sync";
import { getReview } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { getWireframe } from "@/lib/design/wireframe";
import { listFigmaRecordsForReview } from "@/lib/design/figma";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSyncDirection(value: unknown): value is SyncDirection {
  return value === "design-to-code" || value === "code-to-design";
}

/**
 * `POST /api/design/sync/compare` — Design Automation Phase 8. `POST /api/design/sync`와 동일한
 * 계산(Change Detection/Version Compare/Patch Generation/Conflict Detection)을 수행하지만 아무것도
 * 저장하지 않는다 — Dashboard의 "Pending Changes" 미리보기 용도(실행 전에 무엇이 바뀔지 확인).
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

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  if (!isSyncDirection(direction)) {
    return NextResponse.json(
      { success: false, error: 'direction은 "design-to-code"|"code-to-design" 중 하나여야 합니다.' },
      { status: 400 }
    );
  }

  const review = getReview(reviewId);
  if (!review) {
    return NextResponse.json({ success: false, error: `Review "${reviewId}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const claudeDesign = getClaudeDesign(review.claudeDesignId);
  if (!claudeDesign) {
    return NextResponse.json(
      { success: false, error: `Claude Design "${review.claudeDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const prototype = getPrototype(claudeDesign.prototypeId);
  if (!prototype) {
    return NextResponse.json(
      { success: false, error: `Prototype "${claudeDesign.prototypeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const wireframe = getWireframe(prototype.wireframeId);
  if (!wireframe) {
    return NextResponse.json(
      { success: false, error: `Wireframe "${prototype.wireframeId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const figma = listFigmaRecordsForReview(reviewId)[0] ?? null;
  const previous = getLatestSyncForReview(reviewId);
  const result = computeSync({ direction, wireframe, figma, previous, codeOverride });

  return NextResponse.json({
    success: true,
    reviewId,
    projectId: review.planId,
    direction,
    status: result.status,
    patch: result.patch,
    conflicts: result.conflicts,
    compare: { designSnapshot: result.designSnapshot, codeSnapshot: result.codeSnapshot },
  });
}
