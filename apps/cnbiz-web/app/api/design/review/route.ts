import { NextResponse } from "next/server";
import { createReview, listReviews } from "@/lib/design/review-registry";
import { getClaudeDesign } from "@/lib/design/claude-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";
import type { ReviewRecord } from "@/lib/design/review";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toResponse(record: ReviewRecord) {
  return {
    success: true,
    reviewId: record.id,
    projectId: record.planId,
    status: record.status,
    comments: record.comments,
    history: record.history,
    version: record.version,
    review: record,
  };
}

export async function GET() {
  return NextResponse.json({ reviews: await listReviews() });
}

/**
 * `POST /api/design/review` — Design Automation Phase 6. Phase 5의 ClaudeDesignRecord
 * (`claudeDesignId`) 위에서 새 고객 검토(Review)를 시작한다. 응답은 요구사항이 명시한
 * `{reviewId, projectId, status, comments, history, version}`를 그대로 포함하고, 전체
 * 레코드는 `review` 필드로 확장한다(Phase 2~5의 `storyboard`/`wireframe`/`prototype`/
 * `claudeDesign` 필드와 동일한 확장 방식).
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const claudeDesignId = isRecord(body) && typeof body.claudeDesignId === "string" ? body.claudeDesignId.trim() : "";

  if (!claudeDesignId) {
    return NextResponse.json({ success: false, error: "claudeDesignId는 필수입니다." }, { status: 400 });
  }

  const claudeDesign = await getClaudeDesign(claudeDesignId);
  if (!claudeDesign) {
    return NextResponse.json(
      { success: false, error: `Claude Design "${claudeDesignId}"을(를) 찾을 수 없습니다.` },
      { status: 404 }
    );
  }

  const actor = await getCurrentActorEmail();
  const record = await createReview({ claudeDesignId, planId: claudeDesign.planId, actor });

  await recordAuditEvent({
    action: "design.review.create",
    actor,
    success: true,
    detail: `Review 생성(v${record.version}): Claude Design "${claudeDesignId}"`,
  });
  await incrementMetric("reviewCount");

  return NextResponse.json(toResponse(record));
}
