import { NextResponse } from "next/server";
import { getReview } from "@/lib/design/review-registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * `GET /api/design/approval/:id` — 승인 상태 전용 저장소가 없으므로(요구사항 "Do not create
 * another storage"), `:id`는 ReviewRecord의 id를 그대로 가리키며 이 리뷰의 현재 승인 상태를
 * 조회한다(`GET /api/design/review/:id`와 동일한 레코드·동일한 응답 shape).
 */
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
