import fs from "fs";
import path from "path";

/**
 * Design Automation — Phase 5 (docs/03_DESIGN/DESIGN_AUTOMATION_MASTER.md 2번의 Phase 구분,
 * `CLAUDE_DESIGN_INTEGRATION.md` 11번 "Dashboard Integration"). Phase 4(lib/design/prototype.ts의
 * PrototypeRecord — Click Flow/Navigation Flow/Screen Transition/Interaction Map/Component
 * Actions/User Journey/Animation Preview/Prototype Preview)가 이미 만들어 놓은 화면·인터랙션
 * 구성 위에서, 실제 Claude Design(또는 다른 디자인 툴)에 그대로 넘길 수 있는 5종 프롬프트
 * (Design/UI/Component/Theme/Layout Prompt)를 생성한다("Claude Design Prompt Generator on top
 * of Phase 4"). 이 파일은 타입 + fs-JSON registry, 생성 로직은 claude-design-generator.ts에 있다
 * (prototype.ts/prototype-generator.ts와 동일한 파일 분리 관례).
 */

export interface ClaudeDesignContent {
  designPrompt: string;
  uiPrompt: string;
  componentPrompt: string;
  themePrompt: string;
  layoutPrompt: string;
}

export interface ClaudeDesignRecord {
  id: string;
  /** 이 Claude Design 산출물이 어떤 Phase 4 PrototypeRecord 위에서 생성됐는지(lib/design/prototype.ts). */
  prototypeId: string;
  /**
   * Prototype이 이미 담고 있는 `planId`를 그대로 복사해 둔다 — API 응답의 `projectId`를 추가
   * 조회 없이 바로 노출하기 위함(WireframeRecord/PrototypeRecord가 상위 planId를 직접 담는
   * 것과 동일한 편의 체인).
   */
  planId: string;
  content: ClaudeDesignContent;
  /** Provider 미설정/생성 실패 시 결정론적 기본값으로 생성되었는지 여부 (Phase 1~4와 동일한 의미론). */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "design-claude.json");
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

function readRegistry(baseDir: string): ClaudeDesignRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClaudeDesignRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: ClaudeDesignRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

function createRecordId(): string {
  return `claude-design-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createClaudeDesign(
  entry: Omit<ClaudeDesignRecord, "id" | "createdAt">,
  baseDir: string = DEFAULT_BASE_DIR
): ClaudeDesignRecord {
  const record: ClaudeDesignRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const records = readRegistry(baseDir);
  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

/** 최신순(newest first). */
export function listClaudeDesigns(baseDir: string = DEFAULT_BASE_DIR): ClaudeDesignRecord[] {
  return [...readRegistry(baseDir)].reverse();
}

export function getClaudeDesign(id: string, baseDir: string = DEFAULT_BASE_DIR): ClaudeDesignRecord | null {
  return readRegistry(baseDir).find((record) => record.id === id) ?? null;
}

/** 특정 Prototype에서 생성된 Claude Design 산출물만(최신순). */
export function listClaudeDesignsForPrototype(
  prototypeId: string,
  baseDir: string = DEFAULT_BASE_DIR
): ClaudeDesignRecord[] {
  return listClaudeDesigns(baseDir).filter((record) => record.prototypeId === prototypeId);
}
