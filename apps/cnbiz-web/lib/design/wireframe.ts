import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

/**
 * Design Automation — Phase 3 (docs/03_DESIGN/DESIGN_WORKFLOW.md의 Phase 5 "Wireframe").
 * Phase 2(lib/design/storyboard.ts의 StoryboardRecord — Screen Flow/User Journey/Navigation
 * Flow/Page Sequence/Screen Description)가 이미 만들어 놓은 화면 목록·구성요소 위에서
 * Desktop/Tablet/Mobile Layout·Component Layout·Responsive Layout·Screen Sections을
 * 생성한다("Wireframe Generator on top of Phase 2"). 이 파일은 타입 + registry,
 * 생성 로직은 wireframe-generator.ts에 있다(storyboard.ts/storyboard-generator.ts와 동일한
 * 파일 분리 관례).
 */

export type ComponentType =
  | "Header"
  | "Navigation"
  | "Sidebar"
  | "Hero"
  | "Card"
  | "Form"
  | "Table"
  | "Dashboard"
  | "Footer"
  | "Modal"
  | "Button"
  | "Search"
  | "Pagination";

export const COMPONENT_TYPES: ComponentType[] = [
  "Header",
  "Navigation",
  "Sidebar",
  "Hero",
  "Card",
  "Form",
  "Table",
  "Dashboard",
  "Footer",
  "Modal",
  "Button",
  "Search",
  "Pagination",
];

export type Breakpoint = "desktop" | "tablet" | "mobile";

export interface WireframeSection {
  name: string;
  components: ComponentType[];
  description: string;
}

export interface BreakpointLayout {
  breakpoint: Breakpoint;
  /** 그리드 컬럼 수 — desktop 12 / tablet 8 / mobile 4를 기준으로 한다(CNBIZ_RULES.md 4.3 브레이크포인트와 동일한 사고). */
  columns: number;
  sections: WireframeSection[];
}

export interface ScreenLayout {
  /** Phase 2 StoryboardContent.screenDescriptions[].screen과 일치시킨다. */
  screen: string;
  path: string;
  desktop: BreakpointLayout;
  tablet: BreakpointLayout;
  mobile: BreakpointLayout;
}

export interface WireframeComponentSpec {
  type: ComponentType;
  /** 이 컴포넌트를 사용하는 화면 이름 목록. */
  usedIn: string[];
  notes: string;
}

export interface ResponsiveBehavior {
  breakpoint: Breakpoint;
  minWidth: number;
  columns: number;
  notes: string;
}

export interface ResponsiveLayout {
  desktop: ResponsiveBehavior;
  tablet: ResponsiveBehavior;
  mobile: ResponsiveBehavior;
}

export interface WireframeContent {
  layouts: ScreenLayout[];
  components: WireframeComponentSpec[];
  responsive: ResponsiveLayout;
}

export interface WireframeRecord {
  id: string;
  /** 이 Wireframe이 어떤 Phase 2 StoryboardRecord 위에서 생성됐는지(lib/design/storyboard.ts). */
  storyboardId: string;
  /**
   * Storyboard가 참조하는 Phase 1 DesignPlanRecord의 id를 그대로 복사해 둔다 — API 응답의
   * `projectId`를 추가 조회 없이 바로 노출하기 위함(StoryboardRecord가 `planId`를 직접 담는
   * 것과 동일한 편의, storyboardId → planId 체인을 한 번 더 풀어둔 것뿐 새 개념은 아니다).
   */
  planId: string;
  content: WireframeContent;
  /** Provider 미설정/생성 실패 시 결정론적 기본값으로 생성되었는지 여부 (Phase 1·2와 동일한 의미론). */
  simulated: boolean;
  provider?: string;
  model?: string;
  createdAt: string;
}

const COLLECTION = "design-wireframes";

function createRecordId(): string {
  return `wireframe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createWireframe(
  entry: Omit<WireframeRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<WireframeRecord> {
  const record: WireframeRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const records = await store.list<WireframeRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listWireframes(store: CollectionStore = getDefaultStore()): Promise<WireframeRecord[]> {
  const records = await store.list<WireframeRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getWireframe(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<WireframeRecord | null> {
  const records = await store.list<WireframeRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Storyboard에서 생성된 Wireframe만(최신순). */
export async function listWireframesForStoryboard(
  storyboardId: string,
  store: CollectionStore = getDefaultStore()
): Promise<WireframeRecord[]> {
  const records = await listWireframes(store);
  return records.filter((record) => record.storyboardId === storyboardId);
}
