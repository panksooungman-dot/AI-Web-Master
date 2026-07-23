import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

export type WebsiteGenerationStatus = "Success" | "Failed";

/**
 * AI Business OS Rewiring Phase 3 — 고객별 독립 GitHub Repository/Vercel Project 배포 파이프라인
 * (lib/deployment/pipeline.ts)의 진행 상태. "NotConfigured"는 GITHUB_TOKEN/VERCEL_TOKEN이 없어
 * 파이프라인 자체를 시도하지 않은 상태(가짜 URL을 만들지 않는다 — lib/github/client.ts 참고).
 */
export type DeploymentStatus = "NotStarted" | "Success" | "Failed" | "NotConfigured";

export interface WebsiteRepositoryInfo {
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
}

export interface WebsiteDeploymentInfo {
  vercelProjectId: string;
  vercelProjectName: string;
  deploymentId: string;
  url: string;
}

export interface WebsiteRecord {
  id: string;
  name: string;
  siteType: string;
  outDir: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
  createdAt: string;
  /** Phase 3 이전 레코드에는 존재하지 않는다(옵셔널) — 파이프라인이 실행된 뒤에만 채워진다. */
  repository?: WebsiteRepositoryInfo | null;
  deployment?: WebsiteDeploymentInfo | null;
  deploymentStatus?: DeploymentStatus;
  deploymentError?: string | null;
}

export interface CreateWebsiteRecordInput {
  name: string;
  siteType: string;
  outDir: string;
  status: WebsiteGenerationStatus;
  simulatedContent: boolean;
  error?: string;
}

export interface WebsiteDeploymentPatch {
  repository?: WebsiteRepositoryInfo | null;
  deployment?: WebsiteDeploymentInfo | null;
  deploymentStatus?: DeploymentStatus;
  deploymentError?: string | null;
}

const COLLECTION = "websites";

/** Newest first — this is the "Recent Websites / Generation History" list. */
export async function listWebsites(store: CollectionStore = getDefaultStore()): Promise<WebsiteRecord[]> {
  const records = await store.list<WebsiteRecord>(COLLECTION);
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createWebsiteRecord(
  input: CreateWebsiteRecordInput,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteRecord> {
  const record: WebsiteRecord = {
    id: generateId("website"),
    name: input.name,
    siteType: input.siteType,
    outDir: input.outDir,
    status: input.status,
    simulatedContent: input.simulatedContent,
    error: input.error,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<WebsiteRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

export async function getWebsite(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteRecord | undefined> {
  const records = await store.list<WebsiteRecord>(COLLECTION);
  return records.find((website) => website.id === id);
}

/** Phase 3 배포 파이프라인이 결과(repository/deployment/상태)를 기록하는 유일한 진입점. */
export async function updateWebsiteDeployment(
  id: string,
  patch: WebsiteDeploymentPatch,
  store: CollectionStore = getDefaultStore()
): Promise<WebsiteRecord | undefined> {
  const records = await store.list<WebsiteRecord>(COLLECTION);
  const index = records.findIndex((website) => website.id === id);
  if (index === -1) return undefined;

  records[index] = { ...records[index], ...patch };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}
