import fs from "fs";
import path from "path";
import type { ComponentType } from "./wireframe";

/**
 * Design Automation — Phase 4 (docs/03_DESIGN/DESIGN_WORKFLOW.md의 Phase 6 "Prototype").
 * Phase 3(lib/design/wireframe.ts의 WireframeRecord — Desktop/Tablet/Mobile Layout·Component
 * Layout·Responsive Layout·Screen Sections)가 이미 만들어 놓은 화면·컴포넌트 구성 위에서
 * Click Flow·Navigation Flow·Screen Transition·Interaction Map·Component Actions·User Journey·
 * Animation Preview·Prototype Preview를 생성한다("Prototype Generator on top of Phase 3"). 이
 * 파일은 타입 + fs-JSON registry, 생성 로직은 prototype-generator.ts에 있다
 * (wireframe.ts/wireframe-generator.ts와 동일한 파일 분리 관례).
 */

export interface PrototypeScreenRef {
  /** Phase 3 WireframeContent.layouts[].screen과 일치시킨다. */
  screen: string;
  path: string;
}

export interface ClickFlowStep {
  step: number;
  screen: string;
  element: string;
  action: string;
  /** 다음 화면 이름, 또는 흐름의 끝이면 "Complete". */
  leadsTo: string;
}

export interface ClickFlow {
  name: string;
  steps: ClickFlowStep[];
}

export interface NavigationEdge {
  from: string;
  to: string;
  trigger: string;
}

export type TransitionType = "fade" | "slide-left" | "slide-right" | "slide-up" | "modal" | "none";

export interface ScreenTransition {
  from: string;
  to: string;
  type: TransitionType;
  durationMs: number;
}

export interface InteractionSpec {
  element: ComponentType;
  trigger: string;
  result: string;
}

export interface ScreenInteractionMap {
  screen: string;
  interactions: InteractionSpec[];
}

export interface ComponentAction {
  component: ComponentType;
  action: string;
  description: string;
}

export interface PrototypeJourneyStep {
  step: number;
  screen: string;
  action: string;
  emotion?: string;
}

export interface PrototypeUserJourney {
  persona: string;
  goal: string;
  steps: PrototypeJourneyStep[];
}

export interface AnimationPreview {
  screen: string;
  animation: string;
  trigger: string;
  durationMs: number;
}

export interface PrototypePreview {
  startScreen: string;
  totalScreens: number;
  totalInteractions: number;
  summary: string;
}

export interface PrototypeContent {
  screens: PrototypeScreenRef[];
  clickFlows: ClickFlow[];
  navigationFlow: NavigationEdge[];
  screenTransitions: ScreenTransition[];
  interactionMap: ScreenInteractionMap[];
  componentActions: ComponentAction[];
  userJourneys: PrototypeUserJourney[];
  animationPreviews: AnimationPreview[];
  preview: PrototypePreview;
}

export interface PrototypeRecord {
  id: string;
  /** 이 Prototype이 어떤 Phase 3 WireframeRecord 위에서 생성됐는지(lib/design/wireframe.ts). */
  wireframeId: string;
  /**
   * Wireframe이 이미 담고 있는 `planId`를 그대로 복사해 둔다 — API 응답의 `projectId`를 추가
   * 조회 없이 바로 노출하기 위함(WireframeRecord가 StoryboardRecord의 `planId`를 직접 담는
   * 것과 동일한 편의 체인).
   */
  planId: string;
  /**
   * 요구사항 — Registry가 "Version"을 지원해야 한다. 동일 wireframeId에 대해 Prototype을
   * 다시 생성하면 새 레코드가(기존 레코드를 덮어쓰지 않고) 추가되며 `version`이 1씩 증가한다
   * — 히스토리를 그대로 보존하면서 "몇 번째 생성본인지"를 추적할 수 있다.
   */
  version: number;
  content: PrototypeContent;
  /** Provider 미설정/생성 실패 시 결정론적 기본값으로 생성되었는지 여부 (Phase 1~3과 동일한 의미론). */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "design-prototypes.json");
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

function readRegistry(baseDir: string): PrototypeRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PrototypeRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: PrototypeRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

function createRecordId(): string {
  return `prototype-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * `entry.version`은 생략 가능 — 생략 시 동일 `wireframeId`의 기존 레코드 수 + 1로 자동 계산한다
 * (요구사항의 "Version" 지원). 명시적으로 넘기면(테스트 등) 그 값을 그대로 사용한다.
 */
export function createPrototype(
  entry: Omit<PrototypeRecord, "id" | "createdAt" | "version"> & { version?: number },
  baseDir: string = DEFAULT_BASE_DIR
): PrototypeRecord {
  const records = readRegistry(baseDir);
  const version = entry.version ?? records.filter((r) => r.wireframeId === entry.wireframeId).length + 1;

  const record: PrototypeRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
    version,
  };

  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

/** 최신순(newest first). */
export function listPrototypes(baseDir: string = DEFAULT_BASE_DIR): PrototypeRecord[] {
  return [...readRegistry(baseDir)].reverse();
}

export function getPrototype(id: string, baseDir: string = DEFAULT_BASE_DIR): PrototypeRecord | null {
  return readRegistry(baseDir).find((record) => record.id === id) ?? null;
}

/** 특정 Wireframe에서 생성된 Prototype만(최신순 — 즉 최신 version이 먼저). */
export function listPrototypesForWireframe(
  wireframeId: string,
  baseDir: string = DEFAULT_BASE_DIR
): PrototypeRecord[] {
  return listPrototypes(baseDir).filter((record) => record.wireframeId === wireframeId);
}
