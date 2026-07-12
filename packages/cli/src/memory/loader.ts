import fs from "fs-extra";
import path from "path";
import { appendHistoryEntry, readMemoryFile, writeMemoryFile } from "./storage.js";
import type { MemoryContext, MemoryRecord } from "./types.js";

async function resolveProjectName(cwd: string): Promise<string> {
  const pkgPath = path.join(cwd, "package.json");

  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      if (typeof pkg.name === "string" && pkg.name.trim().length > 0) {
        return pkg.name;
      }
    } catch {
      // 손상된 package.json은 무시하고 폴더명으로 대체한다.
    }
  }

  return path.basename(cwd);
}

function buildDefaultContext(cwd: string, project: string, overrides: Partial<MemoryContext> = {}): MemoryContext {
  return {
    project: overrides.project ?? project,
    cwd: overrides.cwd ?? cwd,
    variables: overrides.variables ?? {},
    user: overrides.user ?? {},
    environment: overrides.environment ?? { platform: process.platform, nodeVersion: process.version }
  };
}

export interface GetOrCreateMemoryOptions {
  version?: string;
  context?: Partial<MemoryContext>;
}

/** 순수 조회 — 없으면 null (쓰기 없음) */
export async function loadMemory(cwd: string, workflow: string): Promise<MemoryRecord | null> {
  return readMemoryFile(cwd, workflow);
}

/**
 * 없으면 새 Memory Record를 만들어 저장하고, 있으면 그대로 반환한다(덮어쓰지 않음).
 * Agent Runtime·Workflow Engine이 실행 전 이 함수로 memory를 확보한다.
 */
export async function getOrCreateMemory(
  cwd: string,
  workflow: string,
  options: GetOrCreateMemoryOptions = {}
): Promise<MemoryRecord> {
  const existing = await loadMemory(cwd, workflow);

  if (existing) {
    return existing;
  }

  const project = await resolveProjectName(cwd);
  const now = new Date().toISOString();

  const record: MemoryRecord = {
    workflow,
    version: options.version ?? "1.0.0",
    createdAt: now,
    updatedAt: now,
    context: buildDefaultContext(cwd, project, options.context),
    steps: {}
  };

  await writeMemoryFile(cwd, workflow, record);
  await appendHistoryEntry(cwd, workflow, { event: "created", version: record.version });

  return record;
}
