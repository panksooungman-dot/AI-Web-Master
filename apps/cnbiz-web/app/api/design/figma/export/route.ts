import { NextResponse } from "next/server";
import { exportFigmaFile } from "@/lib/design/figma-generator";
import { recordFigmaExport, listFigmaRecordsForReview, type FigmaRecord } from "@/lib/design/figma";
import { getReview } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { getPrototype } from "@/lib/design/prototype";
import { getWireframe } from "@/lib/design/wireframe";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toResponse(record: FigmaRecord) {
  return {
    success: true,
    figmaId: record.id,
    projectId: record.planId,
    fileId: record.figmaFileId,
    pages: record.content.pages,
    components: record.content.components,
    tokens: record.content.tokens,
    assets: record.content.assets,
    figma: record,
  };
}

/**
 * `POST /api/design/figma/export` — Design Automation Phase 7. 요구사항 5번(Approval Rule):
 * Review 상태가 "approved"가 아니면 409를 반환한다. 승인된 Review → Claude Design → Prototype →
 * Wireframe 체인을 조회해 Figma 구조로 변환한다(figma-generator.ts의 `buildFigmaExportContent()`).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const reviewId = isRecord(body) && typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  const explicitFigmaFileId = isRecord(body) && typeof body.figmaFileId === "string" ? body.figmaFileId.trim() : "";
  const fileName = isRecord(body) && typeof body.fileName === "string" ? body.fileName.trim() : undefined;

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  const review = getReview(reviewId);
  if (!review) {
    return NextResponse.json(
      { success: false, error: `Review "${reviewId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  if (review.status !== "approved") {
    return NextResponse.json(
      {
        success: false,
        error: `Review "${reviewId}"는 아직 승인되지 않았습니다(현재 상태: "${review.status}"). Export는 Approved 상태에서만 가능합니다.`,
      },
      { status: 409 }
    );
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

  const existing = listFigmaRecordsForReview(reviewId)[0] ?? null;
  const figmaFileId = explicitFigmaFileId || existing?.figmaFileId || `figma-export-${reviewId}`;

  const { content, simulated } = await exportFigmaFile({ figmaFileId, wireframe, prototype, claudeDesign });
  const actor = await getCurrentActorEmail();
  const record = recordFigmaExport({
    reviewId,
    planId: review.planId,
    figmaFileId,
    fileName: fileName ?? existing?.fileName ?? `Figma Export — ${review.planId}`,
    content,
    simulated,
    actor,
  });

  await recordAuditEvent({
    action: "design.figma.export",
    actor,
    success: true,
    detail: `Figma Export: Review "${reviewId}" → File "${figmaFileId}"${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("figmaExportCount");

  return NextResponse.json(toResponse(record));
}
