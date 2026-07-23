import type { ReviewComment, ReviewHistoryEntry, ReviewRecord, ReviewStatus } from "./review";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

const COLLECTION = "design-reviews";

function createRecordId(): string {
  return generateId("review");
}

function createCommentId(): string {
  return generateId("comment");
}

function createHistoryId(): string {
  return generateId("history");
}

export interface CreateReviewEntry {
  claudeDesignId: string;
  planId: string;
  actor?: string | null;
  /** 명시적으로 넘기면(테스트 등) 그 값을 그대로 사용, 생략 시 claudeDesignId별 자동 증가(Phase 4 Prototype과 동일한 패턴). */
  version?: number;
}

/**
 * 새 리뷰를 시작한다 — 생성 즉시 "in_review" 상태로 시작한다(Draft는 리뷰 레코드가 아직
 * 만들어지기 전의 개념적 상태를 가리키므로, 리뷰를 실제로 생성하는 행위 자체가 이미
 * "검토를 시작"하는 것이라는 해석. 상세는 DESIGN_AUTOMATION_MASTER.md 8번 참고).
 * `version`은 동일 `claudeDesignId`에 대해 리뷰를 다시 시작할 때마다 1씩 자동 증가한다
 * (Auto Save 요구사항의 "Save on every status change"와 함께, 히스토리를 덮어쓰지 않고 보존).
 */
export async function createReview(
  entry: CreateReviewEntry,
  store: CollectionStore = getDefaultStore()
): Promise<ReviewRecord> {
  const records = await store.list<ReviewRecord>(COLLECTION);
  const version = entry.version ?? records.filter((r) => r.claudeDesignId === entry.claudeDesignId).length + 1;
  const now = new Date().toISOString();
  const actor = entry.actor ?? null;

  const record: ReviewRecord = {
    id: createRecordId(),
    claudeDesignId: entry.claudeDesignId,
    planId: entry.planId,
    version,
    status: "in_review",
    comments: [],
    history: [{ id: createHistoryId(), status: "in_review", actor, note: "리뷰 생성", timestamp: now }],
    createdAt: now,
    updatedAt: now,
  };

  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listReviews(store: CollectionStore = getDefaultStore()): Promise<ReviewRecord[]> {
  const records = await store.list<ReviewRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getReview(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<ReviewRecord | null> {
  const records = await store.list<ReviewRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Claude Design 산출물에서 시작된 Review만(최신순 — 즉 최신 version이 먼저). */
export async function listReviewsForClaudeDesign(
  claudeDesignId: string,
  store: CollectionStore = getDefaultStore()
): Promise<ReviewRecord[]> {
  const records = await listReviews(store);
  return records.filter((record) => record.claudeDesignId === claudeDesignId);
}

/**
 * 댓글을 추가한다(Auto Save 요구사항 "Save comments") — 댓글도 히스토리 항목으로 함께
 * 기록되어 History 타임라인에서 "언제 누가 무슨 코멘트를 남겼는지"를 그대로 재구성할 수 있다.
 * 대상 리뷰가 없으면 null을 반환한다(호출자가 404로 변환).
 */
export async function addReviewComment(
  id: string,
  comment: { author: string | null; text: string },
  store: CollectionStore = getDefaultStore()
): Promise<ReviewRecord | null> {
  const records = await store.list<ReviewRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const newComment: ReviewComment = {
    id: createCommentId(),
    author: comment.author,
    text: comment.text,
    createdAt: now,
  };
  const historyEntry: ReviewHistoryEntry = {
    id: createHistoryId(),
    status: records[index].status,
    actor: comment.author,
    note: `댓글 작성: ${comment.text}`,
    timestamp: now,
  };

  records[index] = {
    ...records[index],
    comments: [...records[index].comments, newComment],
    history: [...records[index].history, historyEntry],
    updatedAt: now,
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/**
 * 상태를 전이시키고 히스토리에 기록한다(Auto Save 요구사항 "Save on every status change"·
 * "Save approval"·"Save history") — 상태 전이의 유효성 검증(어떤 상태에서 어떤 상태로 갈 수
 * 있는지)은 이 함수의 책임이 아니라 lib/design/approval.ts의 책임이다(Review Engine과
 * Approval Engine의 역할 분리). 대상 리뷰가 없으면 null을 반환한다.
 */
export async function transitionReviewStatus(
  id: string,
  status: ReviewStatus,
  options: { actor?: string | null; note?: string } = {},
  store: CollectionStore = getDefaultStore()
): Promise<ReviewRecord | null> {
  const records = await store.list<ReviewRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const historyEntry: ReviewHistoryEntry = {
    id: createHistoryId(),
    status,
    actor: options.actor ?? null,
    note: options.note,
    timestamp: now,
  };

  records[index] = {
    ...records[index],
    status,
    history: [...records[index].history, historyEntry],
    updatedAt: now,
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

/**
 * Review Engine이 지원해야 하는 6개 상태 중 Approval Engine의 4개 액션(Approve/Reject/
 * Request Revision/Cancel Approval)만으로는 도달할 수 없는 "Archived"를 위한 전용 함수 —
 * 어느 상태에서든(이미 archived가 아니라면) 보관 처리할 수 있다.
 */
export async function archiveReview(
  id: string,
  options: { actor?: string | null; note?: string } = {},
  store: CollectionStore = getDefaultStore()
): Promise<ReviewRecord | null> {
  return transitionReviewStatus(id, "archived", { actor: options.actor, note: options.note ?? "보관 처리" }, store);
}
