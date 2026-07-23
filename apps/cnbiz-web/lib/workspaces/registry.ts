import fs from "fs";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";
import { generateId } from "@/lib/id";

export interface WorkspaceRecord {
  id: string;
  name: string;
  path: string;
  createdAt: string;
}

const COLLECTION = "workspaces";

/**
 * `record.path`는 사용자 디스크의 실제 폴더 경로다 — CollectionStore(앱 자체 데이터)가 아니라
 * 진짜 파일시스템을 대상으로 하는 부분이라 fs.existsSync()는 그대로 유지한다(마이그레이션
 * 대상은 "이 레코드들을 어디에 저장하는가"이지, "그 경로가 실제로 존재하는가"라는 질문 자체는
 * 아니다).
 */
export async function listWorkspaces(store: CollectionStore = getDefaultStore()): Promise<WorkspaceRecord[]> {
  const records = await store.list<WorkspaceRecord>(COLLECTION);
  const existing = records.filter((record) => fs.existsSync(record.path));

  if (existing.length !== records.length) {
    await store.replaceAll(COLLECTION, existing);
  }

  return existing;
}

export async function getWorkspace(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<WorkspaceRecord | undefined> {
  const records = await listWorkspaces(store);
  return records.find((record) => record.id === id);
}

export async function createWorkspace(
  name: string,
  targetPath: string,
  store: CollectionStore = getDefaultStore()
): Promise<WorkspaceRecord> {
  // 실제 폴더를 만드는 부분 — CollectionStore로 옮길 수 있는 "레코드 저장"이 아니라, Workspace
  // 개념 자체가 디스크 위의 실제 폴더이므로 그대로 유지한다.
  fs.mkdirSync(targetPath, { recursive: true });

  const record: WorkspaceRecord = {
    id: generateId("workspace"),
    name,
    path: targetPath,
    createdAt: new Date().toISOString(),
  };

  const records = await store.list<WorkspaceRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}
