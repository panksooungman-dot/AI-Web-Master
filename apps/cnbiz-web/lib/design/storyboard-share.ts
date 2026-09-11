import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * "디자인쪽에서 수정할 게 있으면 실제 화면으로 봐야지 개발을 하는 거 아냐" (2026-09-11) —
 * Storyboard(Phase 2)는 지금까지 관리자만 볼 수 있는 내부 기획 문서였다. 실제 코드 생성·배포는
 * "승인 및 생성" 클릭 한 번으로 바로 진행되므로, 의뢰자가 화면 구성을 보고 확인/수정요청할
 * 지점이 개발 착수 전에 전혀 없었다. 이 모듈은 특정 Storyboard를 로그인 없이 열리는 링크로
 * 공유해 의뢰자가 보고 승인하거나 수정을 요청할 수 있게 한다(app/launch-request/[id]/page.tsx
 * 의 "로그인 없이 여는 공개 페이지" 패턴을 그대로 재사용, 새 개념 아님).
 *
 * Phase 6(lib/design/review.ts)의 Review Engine을 재사용하지 않고 별도로 둔 이유 — Review는
 * Phase 5(ClaudeDesignRecord)를 대상으로 하고 항상 로그인한 관리자가 스스로 승인/반려하는
 * "내부 검토" 워크플로다. 이 기능은 Phase 2(Storyboard)를 대상으로, 로그인하지 않은 실제
 * 의뢰자가 응답 주체라는 점이 근본적으로 다르다 — 억지로 합치면 Review Engine의 기존 상태
 * 기계(6개 상태·actor는 항상 로그인 사용자)를 왜곡해야 한다.
 */

export type StoryboardShareStatus = "pending" | "approved" | "revision_requested";

export interface StoryboardShareRecord {
  id: string;
  storyboardId: string;
  status: StoryboardShareStatus;
  /** 의뢰자가 "수정 요청" 시 남긴 메모. 승인 시에는 없을 수 있다. */
  comment: string | null;
  createdAt: string;
  respondedAt: string | null;
}

const COLLECTION = "design-storyboard-shares";

export async function createStoryboardShare(
  storyboardId: string,
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardShareRecord> {
  const record: StoryboardShareRecord = {
    id: generateId("storyboard-share"),
    storyboardId,
    status: "pending",
    comment: null,
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  const records = await store.list<StoryboardShareRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function getStoryboardShare(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardShareRecord | undefined> {
  const records = await store.list<StoryboardShareRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

/** 이미 만들어 둔 공유 링크가 있으면 재사용하고, 없으면 새로 만든다(같은 Storyboard를 여러 번
 *  "공유" 눌러도 링크가 계속 늘어나지 않게 함). */
export async function getOrCreateStoryboardShare(
  storyboardId: string,
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardShareRecord> {
  const records = await store.list<StoryboardShareRecord>(COLLECTION);
  const existing = records.find((record) => record.storyboardId === storyboardId);
  if (existing) return existing;

  return createStoryboardShare(storyboardId, store);
}

export async function respondToStoryboardShare(
  id: string,
  response: { status: "approved" | "revision_requested"; comment?: string | null },
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardShareRecord | undefined> {
  const records = await store.list<StoryboardShareRecord>(COLLECTION);
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) return undefined;

  records[index] = {
    ...records[index],
    status: response.status,
    comment: response.comment ?? null,
    respondedAt: new Date().toISOString(),
  };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
