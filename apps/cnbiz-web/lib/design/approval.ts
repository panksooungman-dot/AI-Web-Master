import { APPROVAL_TRANSITIONS, type ApprovalAction, type ReviewRecord } from "./review";
import { getReview, transitionReviewStatus } from "./review-registry";
import type { CollectionStore } from "@/lib/db/collectionStore";

/**
 * Design Automation — Phase 6 Approval Engine. Review Engine(review.ts/review-registry.ts)이
 * 저장하는 ReviewRecord 위에서 Approve/Reject/Request Revision/Cancel Approval 4개 액션의
 * 유효성(현재 상태에서 그 액션을 수행할 수 있는지)을 검증하고, 통과하면
 * review-registry.ts의 `transitionReviewStatus()`를 호출해 실제 상태 전이·히스토리 기록을
 * 위임한다. 별도의 저장소를 만들지 않고 Review Registry를 그대로 재사용한다(요구사항
 * "Do not create another storage").
 */
export interface ApprovalOptions {
  actor?: string | null;
  note?: string;
}

export interface ApprovalResult {
  success: boolean;
  record?: ReviewRecord;
  /** 실패 원인 — "not_found"(대상 리뷰 없음) | "invalid_transition"(현재 상태에서 수행 불가). */
  errorCode?: "not_found" | "invalid_transition";
  error?: string;
}

async function applyApprovalAction(
  id: string,
  action: ApprovalAction,
  options: ApprovalOptions = {},
  store?: CollectionStore
): Promise<ApprovalResult> {
  const review = await getReview(id, store);
  if (!review) {
    return { success: false, errorCode: "not_found", error: `Review "${id}"을(를) 찾을 수 없습니다.` };
  }

  const transition = APPROVAL_TRANSITIONS[action];
  if (!transition.from.includes(review.status)) {
    return {
      success: false,
      errorCode: "invalid_transition",
      error: `현재 상태("${review.status}")에서는 "${action}" 작업을 수행할 수 없습니다. (허용된 상태: ${transition.from.join(", ")})`,
    };
  }

  const updated = await transitionReviewStatus(id, transition.to, options, store);
  return updated
    ? { success: true, record: updated }
    : { success: false, errorCode: "not_found", error: `Review "${id}"을(를) 찾을 수 없습니다.` };
}

export async function approveReview(
  id: string,
  options: ApprovalOptions = {},
  store?: CollectionStore
): Promise<ApprovalResult> {
  return applyApprovalAction(id, "approve", options, store);
}

export async function rejectReview(
  id: string,
  options: ApprovalOptions = {},
  store?: CollectionStore
): Promise<ApprovalResult> {
  return applyApprovalAction(id, "reject", options, store);
}

export async function requestRevision(
  id: string,
  options: ApprovalOptions = {},
  store?: CollectionStore
): Promise<ApprovalResult> {
  return applyApprovalAction(id, "revision", options, store);
}

export async function cancelApproval(
  id: string,
  options: ApprovalOptions = {},
  store?: CollectionStore
): Promise<ApprovalResult> {
  return applyApprovalAction(id, "cancel", options, store);
}

/** 액션 이름(요청 body의 `action`)으로 위 4개 함수 중 하나를 디스패치한다 — API route에서 재사용. */
export async function applyApproval(
  id: string,
  action: ApprovalAction,
  options: ApprovalOptions = {},
  store?: CollectionStore
): Promise<ApprovalResult> {
  return applyApprovalAction(id, action, options, store);
}
