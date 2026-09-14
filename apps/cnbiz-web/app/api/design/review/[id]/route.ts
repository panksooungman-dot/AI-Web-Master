import { NextResponse } from "next/server";
import { deleteReview, getReview } from "@/lib/design/review-registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/review/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getReview(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Review "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    reviewId: record.id,
    projectId: record.planId,
    status: record.status,
    comments: record.comments,
    history: record.history,
    version: record.version,
    review: record,
  });
}

/**
 * History 목록의 삭제 버튼. "Archived"(archiveReview(), 상태만 바꾸고 목록에 남김)와는 별개로,
 * 레코드 자체를 목록에서 완전히 제거한다. app/api/design/requirements/[id]/route.ts의 DELETE와
 * 동일한 패턴.
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getReview(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Review "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  await deleteReview(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.review.delete",
    actor,
    success: true,
    detail: `Review "${id}" 삭제`,
    metadata: { reviewId: id, claudeDesignId: record.claudeDesignId },
  });

  return NextResponse.json({ success: true });
}
