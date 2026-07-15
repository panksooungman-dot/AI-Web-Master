import { NextResponse } from "next/server";
import { applyApproval } from "@/lib/design/approval";
import { isApprovalAction, type ApprovalAction } from "@/lib/design/review";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";
import type { AuditAction } from "@/lib/audit/log";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** 4개 액션 중 요구사항이 명시한 감사 로그 액션(design.review.approve/reject/revision)만 매핑한다 — cancel은 요구사항에 없어 감사 로그·Metrics를 남기지 않는다(상태 전이 자체는 그대로 지원). */
const AUDIT_ACTION_BY_APPROVAL: Partial<Record<ApprovalAction, AuditAction>> = {
  approve: "design.review.approve",
  reject: "design.review.reject",
  revision: "design.review.revision",
};

/**
 * `POST /api/design/approval` — Design Automation Phase 6. Review Engine(lib/design/
 * review-registry.ts)이 저장한 ReviewRecord(`reviewId`)에 대해 Approve/Reject/Request
 * Revision/Cancel Approval 중 하나를 수행한다. 별도 Approval 저장소는 만들지 않고
 * Review Registry를 그대로 재사용한다(요구사항 "Do not create another storage") — 응답은
 * `POST /api/design/review`와 동일한 `{reviewId, projectId, status, comments, history,
 * version}` shape에 전체 레코드를 `review` 필드로 확장한 것을 그대로 반환한다.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const reviewId = isRecord(body) && typeof body.reviewId === "string" ? body.reviewId.trim() : "";
  const action = isRecord(body) ? body.action : undefined;
  const note = isRecord(body) && typeof body.note === "string" ? body.note : undefined;

  if (!reviewId) {
    return NextResponse.json({ success: false, error: "reviewId는 필수입니다." }, { status: 400 });
  }

  if (!isApprovalAction(action)) {
    return NextResponse.json(
      { success: false, error: 'action은 "approve"|"reject"|"revision"|"cancel" 중 하나여야 합니다.' },
      { status: 400 }
    );
  }

  const actor = await getCurrentActorEmail();
  const result = await applyApproval(reviewId, action, { actor, note });

  if (!result.success || !result.record) {
    const status = result.errorCode === "not_found" ? 404 : 409;
    return NextResponse.json({ success: false, error: result.error }, { status });
  }

  const auditAction = AUDIT_ACTION_BY_APPROVAL[action];
  if (auditAction) {
    await recordAuditEvent({
      action: auditAction,
      actor,
      success: true,
      detail: `Review "${reviewId}" ${action} → ${result.record.status}`,
    });
  }

  if (action === "approve") await incrementMetric("approvalCount");
  if (action === "revision") await incrementMetric("revisionCount");

  return NextResponse.json({
    success: true,
    reviewId: result.record.id,
    projectId: result.record.planId,
    status: result.record.status,
    comments: result.record.comments,
    history: result.record.history,
    version: result.record.version,
    review: result.record,
  });
}
