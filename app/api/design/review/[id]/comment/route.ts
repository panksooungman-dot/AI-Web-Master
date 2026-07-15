import { NextResponse } from "next/server";
import { addReviewComment } from "@/lib/design/review-registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * `POST /api/design/review/:id/comment` — 요구사항 명세(14번 API)에는 없는 추가 엔드포인트다.
 * Dashboard(요구사항 4번)와 Review Engine(요구사항 1번 "Store: Comments")이 댓글 작성을
 * 요구하지만, 별도 댓글 API가 문서에 명시되어 있지 않아 REST 관례에 맞춰 additive로 추가했다
 * (Phase 1~5가 목록 조회 등 스펙에 없는 엔드포인트를 additive로 추가한 것과 동일한 원칙).
 * 작성자는 클라이언트 입력을 신뢰하지 않고 항상 `getCurrentActorEmail()`로 서버가 결정한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const text = isRecord(body) && typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ success: false, error: "text는 필수입니다." }, { status: 400 });
  }

  const actor = await getCurrentActorEmail();
  const record = addReviewComment(id, { author: actor, text });

  if (!record) {
    return NextResponse.json({ success: false, error: `Review "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  recordAuditEvent({
    action: "design.review.comment",
    actor,
    success: true,
    detail: `댓글 작성: Review "${id}"`,
  });

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
