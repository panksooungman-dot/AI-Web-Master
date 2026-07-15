import fs from "fs";
import path from "path";

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
  | "design.review.revision";

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

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");
/** eventBus.ts의 MAX_HISTORY(200)와 같은 취지 — 무한 증가를 막는 상한. 오래된 항목부터 제거. */
const MAX_ENTRIES = 500;

function registryPath(baseDir: string): string {
  return path.join(baseDir, "audit-log.json");
}

function ensureRegistryFile(baseDir: string): void {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = registryPath(baseDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf-8");
  }
}

function readRegistry(baseDir: string): AuditEntry[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AuditEntry[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, entries: AuditEntry[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(entries, null, 2), "utf-8");
}

function createEntryId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 오래된 순으로 저장되며(append), 조회 시 최신순으로 뒤집는다(listAuditEvents 참고). */
export function recordAuditEvent(
  entry: Omit<AuditEntry, "id" | "timestamp">,
  baseDir: string = DEFAULT_BASE_DIR
): AuditEntry {
  const record: AuditEntry = {
    id: createEntryId(),
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const entries = readRegistry(baseDir);
  entries.push(record);

  const trimmed = entries.length > MAX_ENTRIES ? entries.slice(entries.length - MAX_ENTRIES) : entries;
  writeRegistry(baseDir, trimmed);

  return record;
}

export interface ListAuditOptions {
  action?: AuditAction;
  successOnly?: boolean;
  failuresOnly?: boolean;
  limit?: number;
}

/** 최신순(newest first)으로 반환한다. */
export function listAuditEvents(
  options: ListAuditOptions = {},
  baseDir: string = DEFAULT_BASE_DIR
): AuditEntry[] {
  const entries = readRegistry(baseDir)
    .filter((entry) => !options.action || entry.action === options.action)
    .filter((entry) => !options.successOnly || entry.success)
    .filter((entry) => !options.failuresOnly || !entry.success)
    .reverse();

  return typeof options.limit === "number" ? entries.slice(0, options.limit) : entries;
}
