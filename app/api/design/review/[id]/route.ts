import { NextResponse } from "next/server";
import { getReview } from "@/lib/design/review-registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/review/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getReview(id);

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
