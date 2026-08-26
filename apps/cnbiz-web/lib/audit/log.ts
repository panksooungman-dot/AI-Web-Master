import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * 요구사항 — Audit Log. Login/Logout/Marketplace publish·install·remove/Website generation/
 * AI task execution을 기록한다. `build.run`은 Metrics의 "Build count" 계산을 위해 추가로
 * 기록하는 항목(요구사항의 5개 필수 action 외 부가) — Error Reporting(`lib/audit/log.ts`를
 * `success:false`로 필터링)도 이 store 하나를 그대로 재사용한다.
 */
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "marketplace.publish"
  | "marketplace.install"
  | "marketplace.remove"
  | "website.generate"
  | "ai.task"
  | "build.run"
  | "design.generate"
  | "design.storyboard.generate"
  | "design.wireframe.generate"
  | "design.prototype.generate"
  | "design.claude.generate"
  | "design.review.create"
  | "design.review.comment"
  | "design.review.approve"
  | "design.review.reject"
  | "design.review.revision"
  | "design.figma.import"
  | "design.figma.export"
  | "design.sync.start"
  | "design.sync.complete"
  | "design.sync.rollback"
  | "design.sync.conflict"
  | "design.website.build"
  | "deployment.github.create_repo"
  | "deployment.git.commit_push"
  | "deployment.vercel.create_project"
  | "deployment.vercel.link_repo"
  | "deployment.vercel.deploy"
  | "deployment.pipeline.success"
  | "deployment.pipeline.failed"
  | "deployment.pipeline.rollback"
  | "workspace.autoprovision"
  | "deployment.notify_customer"
  | "estimate.generate"
  | "specification.generate"
  | "timeline.generate"
  | "contract.generate"
  | "proposal.generate"
  | "launchRequest.generate"
  | "inquiry.notify_admin"
  | "inquiry.notify_admin_slack"
  | "inquiry.notify_admin_solapi"
  | "customer.login"
  | "customer.view_document"
  | "inquiry.update"
  | "inquiry.delete"
  | "inquiry.analyze";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  /** 로그인한 사용자 이메일. 인증 이전/알 수 없는 경우 null. */
  actor: string | null;
  success: boolean;
  detail: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const COLLECTION = "audit-log";
/** eventBus.ts의 MAX_HISTORY(200)와 같은 취지 — 무한 증가를 막는 상한. 오래된 항목부터 제거. */
const MAX_ENTRIES = 500;

function createEntryId(): string {
  return generateId("audit");
}

export async function recordAuditEvent(
  entry: Omit<AuditEntry, "id" | "timestamp">,
  store: CollectionStore = getDefaultStore()
): Promise<AuditEntry> {
  const record: AuditEntry = {
    id: createEntryId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const entries = await store.list<AuditEntry>(COLLECTION);
  entries.push(record);

  // listAuditEvents()와 동일한 이유로 timestamp 기준 정렬 후 트리밍한다 — store.list()의 반환
  // 순서에 기대어 "뒤쪽 MAX_ENTRIES개"를 자르면(Supabase는 순서를 보장하지 않음) 실제로는
  // 오래되지 않은 항목이 잘려나갈 수 있다.
  entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
  await store.replaceAll(COLLECTION, trimmed);

  return record;
}

export interface ListAuditOptions {
  action?: AuditAction;
  successOnly?: boolean;
  failuresOnly?: boolean;
  limit?: number;
}

/**
 * 최신순(newest first)으로 반환한다. `store.list()`가 반환하는 행 순서는 저장소 구현(특히
 * Supabase — app_collections 테이블 조회에 ORDER BY가 없음)에 따라 삽입 순서와 다를 수 있어,
 * append 순서에 기대는 대신 매번 `timestamp` 문자열(ISO 8601이라 사전순 정렬이 곧 시간순)
 * 기준으로 명시적으로 정렬한다 — 실사용에서 Audit Log 화면 순서가 뒤죽박죽으로 보이는 문제의
 * 원인이었다.
 *
 * `timestamp`는 1ms 단위라, 같은 밀리초에 기록된 두 항목은 정렬 기준으로 서로 구분되지 않는다
 * (Array.sort는 안정 정렬이라 비교 함수가 0을 반환하면 원래 순서를 유지함). fsStore처럼
 * store.list()가 실제 삽입 순서(오래된 것부터)를 그대로 반환하는 구현에서는, 배열을 먼저
 * 뒤집어(최신이 앞으로) 안정 정렬하면 같은 타임스탬프인 항목들도 "나중에 삽입된 것이 앞"이라는
 * 올바른 최신순으로 남는다.
 */
export async function listAuditEvents(
  options: ListAuditOptions = {},
  store: CollectionStore = getDefaultStore()
): Promise<AuditEntry[]> {
  const all = await store.list<AuditEntry>(COLLECTION);
  const entries = all
    .filter((entry) => !options.action || entry.action === options.action)
    .filter((entry) => !options.successOnly || entry.success)
    .filter((entry) => !options.failuresOnly || !entry.success)
    .reverse()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return typeof options.limit === "number" ? entries.slice(0, options.limit) : entries;
}
