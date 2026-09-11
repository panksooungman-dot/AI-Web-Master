import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * "의뢰자한테 실제화면으로 보여줘야지 의뢰자도 이해를 할 수가 있지" (2026-09-11) —
 * lib/design/storyboard-share.ts(텍스트 기획 문서 공유)만으로는 부족하다는 후속 요청. AI가 실제
 * 코드를 생성한 뒤 자동으로 만들어지는 Preview 배포(lib/deployment/pipeline.ts, 진짜 동작하는
 * 웹사이트)를 의뢰자에게 로그인 없이 공유해, 실제 화면을 보고 승인/수정요청할 수 있게 한다.
 *
 * storyboard-share.ts와 별도 모듈로 둔 이유 — 대상이 텍스트 문서(Storyboard)가 아니라 실제
 * 배포 URL(WebsiteRecord.deployment.url)이고, "PreviewReady" 상태에서만 의미가 있다는 도메인
 * 규칙이 달라 억지로 하나로 합치면 오히려 두 워크플로의 차이를 흐리게 된다(Rule of Two —
 * 실제 중복이 확인되기 전까지는 추상화하지 않는다, CLAUDE.md).
 */

export type WebsitePreviewShareStatus = "pending" | "approved" | "revision_requested";

export interface WebsitePreviewShareRecord {
  id: string;
  websiteId: string;
  status: WebsitePreviewShareStatus;
  comment: string | null;
  createdAt: string;
  respondedAt: string | null;
}

const COLLECTION = "website-preview-shares";

export async function createWebsitePreviewShare(
  websiteId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsitePreviewShareRecord> {
  const record: WebsitePreviewShareRecord = {
    id: generateId("preview-share"),
    websiteId,
    status: "pending",
    comment: null,
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  const records = await store.list<WebsitePreviewShareRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function getWebsitePreviewShare(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsitePreviewShareRecord | undefined> {
  const records = await store.list<WebsitePreviewShareRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}

/** 같은 Website에 대해 이미 만들어 둔 공유 링크가 있으면 재사용한다. */
export async function getOrCreateWebsitePreviewShare(
  websiteId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsitePreviewShareRecord> {
  const records = await store.list<WebsitePreviewShareRecord>(COLLECTION);
  const existing = records.find((record) => record.websiteId === websiteId);
  if (existing) return existing;

  return createWebsitePreviewShare(websiteId, store);
}

export async function respondToWebsitePreviewShare(
  id: string,
  response: { status: "approved" | "revision_requested"; comment?: string | null },
  store: CollectionStore = getDefaultStore()
): Promise<WebsitePreviewShareRecord | undefined> {
  const records = await store.list<WebsitePreviewShareRecord>(COLLECTION);
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
