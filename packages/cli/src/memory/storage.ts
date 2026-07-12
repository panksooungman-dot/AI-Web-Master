import fs from "fs-extra";
import path from "path";
import type { MemoryRecord } from "./types.js";

export function memoryDir(cwd: string): string {
  return path.join(cwd, ".runtime", "memory");
}

export function memoryFile(cwd: string, workflow: string): string {
  return path.join(memoryDir(cwd), `${workflow}.json`);
}

export function historyDir(cwd: string): string {
  return path.join(cwd, ".runtime", "history");
}

export function historyFile(cwd: string, workflow: string): string {
  return path.join(historyDir(cwd), `${workflow}.json`);
}

export function exportsDir(cwd: string): string {
  return path.join(cwd, ".runtime", "exports");
}

export function exportFile(cwd: string, workflow: string): string {
  return path.join(exportsDir(cwd), `memory-${workflow}.json`);
}

export async function readMemoryFile(cwd: string, workflow: string): Promise<MemoryRecord | null> {
  const file = memoryFile(cwd, workflow);

  if (!(await fs.pathExists(file))) {
    return null;
  }

  return fs.readJson(file);
}

export async function writeMemoryFile(cwd: string, workflow: string, record: MemoryRecord): Promise<void> {
  const file = memoryFile(cwd, workflow);
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, record, { spaces: 2 });
}

export async function deleteMemoryFile(cwd: string, workflow: string): Promise<boolean> {
  const file = memoryFile(cwd, workflow);
  const existed = await fs.pathExists(file);

  if (existed) {
    await fs.remove(file);
  }

  return existed;
}

/** .runtime/memory/*.json 을 나열한다 (확장자를 뗀 이름 목록, 정렬됨) */
export async function listMemoryFiles(cwd: string): Promise<string[]> {
  const dir = memoryDir(cwd);

  if (!(await fs.pathExists(dir))) {
    return [];
  }

  const entries = await fs.readdir(dir);

  return entries
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();
}

/** .runtime/history/<workflow>.json 에 이벤트를 append한다(Memory 변경 감사 로그). */
export async function appendHistoryEntry(
  cwd: string,
  workflow: string,
  entry: Record<string, unknown>
): Promise<void> {
  const file = historyFile(cwd, workflow);
  await fs.ensureDir(path.dirname(file));

  let history: Record<string, unknown>[] = [];

  if (await fs.pathExists(file)) {
    try {
      const raw = await fs.readJson(file);
      if (Array.isArray(raw)) {
        history = raw;
      }
    } catch {
      history = [];
    }
  }

  history.push({ timestamp: new Date().toISOString(), ...entry });
  await fs.writeJson(file, history, { spaces: 2 });
}

/** .runtime/exports/memory-<workflow>.json 으로 내보낸다. */
export async function writeExportFile(cwd: string, workflow: string, record: MemoryRecord): Promise<string> {
  const file = exportFile(cwd, workflow);
  await fs.ensureDir(path.dirname(file));
  await fs.writeJson(file, record, { spaces: 2 });
  return file;
}
