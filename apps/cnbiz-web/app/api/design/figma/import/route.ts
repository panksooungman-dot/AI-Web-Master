import { NextResponse } from "next/server";
import { importFigmaFile } from "@/lib/design/figma-generator";
import { recordFigmaImport, type FigmaRecord } from "@/lib/design/figma";
import { getReview } from "@/lib/design/review-registry";
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
 * `POST /api/design/figma/import` — Design Automation Phase 7. Phase 6 ReviewRecord(`reviewId`)에
 * Figma 파일(`figmaFileId`)을 연결해 콘텐츠를 가져온다. Export와 달리 Approved 상태를 요구하지
 * 않는다 — 참고 자료 Import는 검토가 끝나기 전에도 자유롭게 수행할 수 있어야 한다는 판단
 * (요구사항 5번의 Approval Rule은 Export에만 명시됨, 상세는
 * docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 9번 참고).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const reviewId = isRecord(body) && typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  const figmaFileId = isRecord(body) && typeof body.figmaFileId === "string" ? body.figmaFileId.trim() : "";
  const fileName = isRecord(body) && typeof body.fileName === "string" ? body.fileName.trim() : undefined;

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  if (!figmaFileId) {
    return NextResponse.json({ success: false, error: "figmaFileId는 필수입니다." }, { status: 400 });
  }

  const review = getReview(reviewId);
  if (!review) {
    return NextResponse.json(
      { success: false, error: `Review "${reviewId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const { content, fileName: resolvedFileName, simulated } = await importFigmaFile({ figmaFileId, fileName });
  const actor = await getCurrentActorEmail();
  const record = recordFigmaImport({
    reviewId,
    planId: review.planId,
    figmaFileId,
    fileName: resolvedFileName,
    content,
    simulated,
    actor,
  });

  await recordAuditEvent({
    action: "design.figma.import",
    actor,
    success: true,
    detail: `Figma Import: Review "${reviewId}" ← File "${figmaFileId}"${simulated ? " (simulated)" : ""}`,
  });
  await incrementMetric("figmaImportCount");

  return NextResponse.json(toResponse(record));
}
