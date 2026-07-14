import fs from "fs";
import path from "path";

/**
 * Design Automation — Phase 2 (docs/03_DESIGN/DESIGN_WORKFLOW.md의 Phase 4 "Storyboard").
 * Phase 1(lib/design/types.ts의 DesignPlanRecord — Requirement Analysis/Feature List/Site Map/
 * User Flow/Screen List)이 이미 만들어 놓은 Site Map·Screen List 위에서 Screen Flow·User Journey·
 * Navigation Flow·Page Sequence·Screen Description을 생성한다("Storyboard Generator on top of
 * Phase 1"). 이 파일은 타입 + fs-JSON registry, 생성 로직은 storyboard-generator.ts에 있다
 * (lib/design/types.ts + registry.ts의 Phase 1 분리를 이번엔 요구사항대로 파일 2개로 합쳐 유지).
 */

export interface ScreenFlowNode {
  /** Phase 1 ScreenListItem.name과 일치시킨다. */
  screen: string;
  path: string;
  description: string;
}

export interface NavigationFlowEdge {
  from: string;
  to: string;
  trigger: string;
}

export interface UserJourneyStep {
  step: number;
  screen: string;
  goal: string;
  emotion?: string;
}

export interface UserJourney {
  persona: string;
  goal: string;
  steps: UserJourneyStep[];
}

export interface PageSequenceItem {
  order: number;
  screen: string;
  path: string;
}

export interface ScreenDescription {
  screen: string;
  path: string;
  purpose: string;
  keyElements: string[];
}

export interface StoryboardContent {
  screenFlow: ScreenFlowNode[];
  userJourneys: UserJourney[];
  navigationFlow: NavigationFlowEdge[];
  pageSequence: PageSequenceItem[];
  screenDescriptions: ScreenDescription[];
}

export interface StoryboardRecord {
  id: string;
  /** 이 Storyboard가 어떤 Phase 1 DesignPlanRecord 위에서 생성됐는지(lib/design/registry.ts). */
  planId: string;
  content: StoryboardContent;
  /** Provider 미설정/생성 실패 시 결정론적 기본값으로 생성되었는지 여부 (Phase 1과 동일한 의미론). */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "design-storyboards.json");
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

function readRegistry(baseDir: string): StoryboardRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoryboardRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: StoryboardRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

function createRecordId(): string {
  return `storyboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createStoryboard(
  entry: Omit<StoryboardRecord, "id" | "createdAt">,
  baseDir: string = DEFAULT_BASE_DIR
): StoryboardRecord {
  const record: StoryboardRecord = {
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
export function listStoryboards(baseDir: string = DEFAULT_BASE_DIR): StoryboardRecord[] {
  return [...readRegistry(baseDir)].reverse();
}

export function getStoryboard(id: string, baseDir: string = DEFAULT_BASE_DIR): StoryboardRecord | null {
  return readRegistry(baseDir).find((record) => record.id === id) ?? null;
}

/** 특정 Design Plan에서 생성된 Storyboard만(최신순). */
export function listStoryboardsForPlan(planId: string, baseDir: string = DEFAULT_BASE_DIR): StoryboardRecord[] {
  return listStoryboards(baseDir).filter((record) => record.planId === planId);
}
