/**
 * Design Automation — Phase 6 (docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 2번의 Phase 구분,
 * `DESIGN_WORKFLOW.md` 10번 "Phase 8 - 고객 검토"). Phase 5(lib/design/claude-design.ts의
 * ClaudeDesignRecord — Design/UI/Component/Theme/Layout Prompt)가 이미 만들어 놓은 산출물을
 * 대상으로 고객 검토·코멘트·승인/반려/수정요청 워크플로를 제공한다("Customer Review &
 * Approval on top of Phase 5"). 이 파일은 순수 타입 + 상태 전이 규칙(fs 의존성 없음),
 * 영속화는 review-registry.ts, 승인 액션의 유효성 검증·적용은 approval.ts에 있다.
 */

export type ReviewStatus =
  | "draft"
  | "in_review"
  | "revision_requested"
  | "approved"
  | "rejected"
  | "archived";

export const REVIEW_STATUSES: ReviewStatus[] = [
  "draft",
  "in_review",
  "revision_requested",
  "approved",
  "rejected",
  "archived",
];

export interface ReviewComment {
  id: string;
  /** 댓글 작성자 — API에서는 항상 `getCurrentActorEmail()`로 서버가 결정한다(클라이언트가 사칭 불가). */
  author: string | null;
  text: string;
  createdAt: string;
}

export interface ReviewHistoryEntry {
  id: string;
  status: ReviewStatus;
  /** 이 전이를 발생시킨 사람 — 로그인한 사용자 이메일 또는 null(익명/시스템). */
  actor: string | null;
  note?: string;
  timestamp: string;
}

export interface ReviewRecord {
  id: string;
  /** 이 Review가 어떤 Phase 5 ClaudeDesignRecord를 검토 대상으로 하는지(lib/design/claude-design.ts). */
  claudeDesignId: string;
  /**
   * ClaudeDesignRecord가 이미 담고 있는 `planId`를 그대로 복사해 둔다 — API 응답의 `projectId`를
   * 추가 조회 없이 바로 노출하기 위함(WireframeRecord/PrototypeRecord/ClaudeDesignRecord가
   * 상위 planId를 직접 담는 것과 동일한 편의 체인).
   */
  planId: string;
  /** 동일 claudeDesignId에 대해 리뷰를 다시 시작하면(재검토 사이클) 새 레코드가 추가되며 1씩 증가한다. */
  version: number;
  status: ReviewStatus;
  comments: ReviewComment[];
  history: ReviewHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export type ApprovalAction = "approve" | "reject" | "revision" | "cancel";

interface ApprovalTransitionRule {
  from: ReviewStatus[];
  to: ReviewStatus;
}

/**
 * Approval Engine(lib/design/approval.ts)이 참조하는 상태 전이 규칙. 요구사항의 4개 액션
 * (Approve/Reject/Request Revision/Cancel Approval)만 정의한다 — "Draft"/"Archived"는
 * Review Engine이 지원해야 하는 상태값으로 타입에는 포함하되, 이 4개 액션의 전이표에는
 * 등장하지 않는다(Draft는 생성 이전 개념적 상태, Archived는 review-registry.ts의
 * `archiveReview()`로 별도 지원 — `DESIGN_AUTOMATION_MASTER.md` 8번 참고).
 */
export const APPROVAL_TRANSITIONS: Record<ApprovalAction, ApprovalTransitionRule> = {
  approve: { from: ["in_review", "revision_requested"], to: "approved" },
  reject: { from: ["in_review", "revision_requested"], to: "rejected" },
  revision: { from: ["in_review"], to: "revision_requested" },
  cancel: { from: ["approved", "rejected"], to: "in_review" },
};

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && (REVIEW_STATUSES as string[]).includes(value);
}

export function isApprovalAction(value: unknown): value is ApprovalAction {
  return value === "approve" || value === "reject" || value === "revision" || value === "cancel";
}
