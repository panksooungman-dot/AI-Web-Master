import fs from "fs-extra";
import path from "path";

export interface UsageEntry {
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  simulated: boolean;
}

function usageFile(cwd: string): string {
  return path.join(cwd, ".runtime", "usage.json");
}

/**
 * ProviderManager.complete()의 단일 지점에서만 호출된다 — Website Builder Content Engine,
 * Agent Runtime, `ai chat` 등 모든 호출자를 한 곳에서 커버한다 (호출부마다 재구현하지 않음).
 */
export async function recordUsage(cwd: string, entry: Omit<UsageEntry, "timestamp">): Promise<void> {
  const file = usageFile(cwd);
  await fs.ensureDir(path.dirname(file));

  let entries: UsageEntry[] = [];

  if (await fs.pathExists(file)) {
    try {
      const raw = await fs.readJson(file);
      if (Array.isArray(raw)) {
        entries = raw;
      }
    } catch {
      entries = [];
    }
  }

  entries.push({ timestamp: new Date().toISOString(), ...entry });
  await fs.writeJson(file, entries, { spaces: 2 });
}

export async function listUsage(cwd: string): Promise<UsageEntry[]> {
  const file = usageFile(cwd);

  if (!(await fs.pathExists(file))) {
    return [];
  }

  try {
    const raw = await fs.readJson(file);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export interface UsageSummary {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<string, { calls: number; inputTokens: number; outputTokens: number }>;
}

export function summarizeUsage(entries: UsageEntry[]): UsageSummary {
  const summary: UsageSummary = { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, byProvider: {} };

  for (const entry of entries) {
    summary.totalCalls += 1;
    summary.totalInputTokens += entry.inputTokens;
    summary.totalOutputTokens += entry.outputTokens;

    const bucket = summary.byProvider[entry.provider] ?? { calls: 0, inputTokens: 0, outputTokens: 0 };
    bucket.calls += 1;
    bucket.inputTokens += entry.inputTokens;
    bucket.outputTokens += entry.outputTokens;
    summary.byProvider[entry.provider] = bucket;
  }

  return summary;
}
