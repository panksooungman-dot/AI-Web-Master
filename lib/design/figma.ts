import fs from "fs";
import path from "path";
import type { Breakpoint, ComponentType } from "./wireframe";

/**
 * Design Automation — Phase 7 (docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 2번의 Phase 구분,
 * `DESIGN_WORKFLOW.md` 11번 "Phase 9 - Figma"). Phase 6(lib/design/review.ts의 ReviewRecord)이
 * "Approved" 상태로 전이시킨 산출물을 대상으로 Figma Import/Export를 제공한다. 이 파일은 타입 +
 * fs-JSON registry, 실제 Import/Export 로직은 figma-generator.ts에 있다(claude-design.ts/
 * claude-design-generator.ts와 동일한 파일 분리 관례).
 *
 * "Variables"와 "Design Tokens"(요구사항 1번의 Support 목록)는 별도 배열로 나누지 않고
 * `FigmaContent.tokens` 하나로 합쳤다 — Figma 자체가 2023년부터 Variables API를 Design Tokens의
 * 기술적 구현체로 통합했으므로(같은 개념의 다른 이름), 두 개의 거의 동일한 배열을 중복 유지하지
 * 않기 위함이다. 상세는 DESIGN_AUTOMATION_MASTER.md 9번 참고.
 */

export interface FigmaPage {
  id: string;
  name: string;
  frameCount: number;
}

export interface FigmaFrame {
  id: string;
  name: string;
  page: string;
  breakpoint: Breakpoint;
  width: number;
  height: number;
}

export interface FigmaComponentSpec {
  id: string;
  name: string;
  /** Phase 3 Wireframe의 13종 컴포넌트 팔레트(ComponentType)를 그대로 재사용, 실제 Figma에서
   *  Import한 컴포넌트는 팔레트 밖의 임의 문자열일 수 있어 string도 허용한다. */
  type: ComponentType | string;
  usedIn: string[];
}

export type FigmaTokenCategory = "color" | "spacing" | "typography" | "radius";

export interface FigmaToken {
  id: string;
  name: string;
  category: FigmaTokenCategory;
  value: string;
}

export interface FigmaAsset {
  id: string;
  name: string;
  type: "logo" | "icon" | "image";
  url?: string;
}

export interface FigmaContent {
  pages: FigmaPage[];
  frames: FigmaFrame[];
  components: FigmaComponentSpec[];
  tokens: FigmaToken[];
  assets: FigmaAsset[];
}

export type FigmaOperation = "import" | "export";

export interface FigmaHistoryEntry {
  id: string;
  operation: FigmaOperation;
  version: number;
  actor: string | null;
  simulated: boolean;
  timestamp: string;
}

export interface FigmaRecord {
  id: string;
  /** 이 Figma 파일이 어떤 Phase 6 ReviewRecord와 연결되어 있는지(lib/design/review.ts). */
  reviewId: string;
  /** Review가 이미 담고 있는 planId를 그대로 복사(Phase 2~6과 동일한 편의 체인). */
  planId: string;
  figmaFileId: string;
  fileName: string;
  /** Import/Export가 일어날 때마다 1씩 증가(요구사항 — Registry가 "version"을 지원). */
  version: number;
  content: FigmaContent;
  /** 가장 최근 연산(Import 또는 Export)이 실제 Figma REST API 성공 없이 결정론적으로 생성됐는지 여부. */
  simulated: boolean;
  exportHistory: FigmaHistoryEntry[];
  importHistory: FigmaHistoryEntry[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "design-figma.json");
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

function readRegistry(baseDir: string): FigmaRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FigmaRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: FigmaRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

function createRecordId(): string {
  return `figma-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createHistoryId(): string {
  return `figma-history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 최신순(newest first). */
export function listFigmaRecords(baseDir: string = DEFAULT_BASE_DIR): FigmaRecord[] {
  return [...readRegistry(baseDir)].reverse();
}

export function getFigmaRecord(id: string, baseDir: string = DEFAULT_BASE_DIR): FigmaRecord | null {
  return readRegistry(baseDir).find((record) => record.id === id) ?? null;
}

/** 특정 Review에 연결된 Figma 파일만(최신순). */
export function listFigmaRecordsForReview(
  reviewId: string,
  baseDir: string = DEFAULT_BASE_DIR
): FigmaRecord[] {
  return listFigmaRecords(baseDir).filter((record) => record.reviewId === reviewId);
}

interface UpsertFigmaEntry {
  reviewId: string;
  planId: string;
  figmaFileId: string;
  fileName: string;
  content: FigmaContent;
  simulated: boolean;
  actor?: string | null;
}

/**
 * (reviewId, figmaFileId) 쌍으로 기존 레코드를 찾아 갱신하거나, 없으면 새로 만든다 — 공용 upsert
 * 헬퍼(recordFigmaImport/recordFigmaExport가 공유). 별도의 Import 전용/Export 전용 저장소를
 * 만들지 않고 하나의 FigmaRecord가 두 히스토리 배열을 모두 갖도록 해 요구사항의 "Reuse existing
 * design registry"/"Do not introduce another storage engine"을 그대로 따른다.
 */
function upsertFigmaRecord(
  entry: UpsertFigmaEntry,
  operation: FigmaOperation,
  baseDir: string
): FigmaRecord {
  const records = readRegistry(baseDir);
  const now = new Date().toISOString();
  const existingIndex = records.findIndex(
    (record) => record.reviewId === entry.reviewId && record.figmaFileId === entry.figmaFileId
  );

  if (existingIndex === -1) {
    const historyEntry: FigmaHistoryEntry = {
      id: createHistoryId(),
      operation,
      version: 1,
      actor: entry.actor ?? null,
      simulated: entry.simulated,
      timestamp: now,
    };

    const record: FigmaRecord = {
      id: createRecordId(),
      reviewId: entry.reviewId,
      planId: entry.planId,
      figmaFileId: entry.figmaFileId,
      fileName: entry.fileName,
      version: 1,
      content: entry.content,
      simulated: entry.simulated,
      exportHistory: operation === "export" ? [historyEntry] : [],
      importHistory: operation === "import" ? [historyEntry] : [],
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };

    records.push(record);
    writeRegistry(baseDir, records);
    return record;
  }

  const existing = records[existingIndex];
  const historyEntry: FigmaHistoryEntry = {
    id: createHistoryId(),
    operation,
    version: existing.version + 1,
    actor: entry.actor ?? null,
    simulated: entry.simulated,
    timestamp: now,
  };

  const updated: FigmaRecord = {
    ...existing,
    fileName: entry.fileName,
    version: historyEntry.version,
    content: entry.content,
    simulated: entry.simulated,
    exportHistory: operation === "export" ? [...existing.exportHistory, historyEntry] : existing.exportHistory,
    importHistory: operation === "import" ? [...existing.importHistory, historyEntry] : existing.importHistory,
    updatedAt: now,
  };

  records[existingIndex] = updated;
  writeRegistry(baseDir, records);
  return updated;
}

export function recordFigmaImport(entry: UpsertFigmaEntry, baseDir: string = DEFAULT_BASE_DIR): FigmaRecord {
  return upsertFigmaRecord(entry, "import", baseDir);
}

export function recordFigmaExport(entry: UpsertFigmaEntry, baseDir: string = DEFAULT_BASE_DIR): FigmaRecord {
  return upsertFigmaRecord(entry, "export", baseDir);
}
