import { getMemory } from "./manager.js";
import { appendHistoryEntry, writeExportFile } from "./storage.js";

/** `ai memory export <workflow>` — .runtime/exports/memory-<workflow>.json 으로 내보내고 경로를 반환한다. */
export async function exportMemory(cwd: string, workflow: string): Promise<string> {
  const record = await getMemory(cwd, workflow);
  const file = await writeExportFile(cwd, workflow, record);
  await appendHistoryEntry(cwd, workflow, { event: "exported", file });
  return file;
}
