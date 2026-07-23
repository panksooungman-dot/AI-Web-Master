import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

/**
 * Design Automation — Phase 2 (docs/03_DESIGN/DESIGN_WORKFLOW.md의 Phase 4 "Storyboard").
 * Phase 1(lib/design/types.ts의 DesignPlanRecord — Requirement Analysis/Feature List/Site Map/
 * User Flow/Screen List)이 이미 만들어 놓은 Site Map·Screen List 위에서 Screen Flow·User Journey·
 * Navigation Flow·Page Sequence·Screen Description을 생성한다("Storyboard Generator on top of
 * Phase 1"). 이 파일은 타입 + registry, 생성 로직은 storyboard-generator.ts에 있다
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

const COLLECTION = "design-storyboards";

function createRecordId(): string {
  return generateId("storyboard");
}

export async function createStoryboard(
  entry: Omit<StoryboardRecord, "id" | "createdAt">,
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardRecord> {
  const record: StoryboardRecord = {
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    ...entry,
  };

  const records = await store.list<StoryboardRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** 최신순(newest first). */
export async function listStoryboards(store: CollectionStore = getDefaultStore()): Promise<StoryboardRecord[]> {
  const records = await store.list<StoryboardRecord>(COLLECTION);
  return [...records].reverse();
}

export async function getStoryboard(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardRecord | null> {
  const records = await store.list<StoryboardRecord>(COLLECTION);
  return records.find((record) => record.id === id) ?? null;
}

/** 특정 Design Plan에서 생성된 Storyboard만(최신순). */
export async function listStoryboardsForPlan(
  planId: string,
  store: CollectionStore = getDefaultStore()
): Promise<StoryboardRecord[]> {
  const records = await listStoryboards(store);
  return records.filter((record) => record.planId === planId);
}
