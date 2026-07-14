import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listUsage, recordUsage, summarizeUsage } from "../../packages/cli/src/providers/usage.js";

describe("AI Provider Manager — token usage tracking (packages/cli/src/providers/usage.ts)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "usage-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("listUsage() returns an empty array when no usage has been recorded yet", async () => {
    expect(await listUsage(cwd)).toEqual([]);
  });

  it("recordUsage() appends entries; listUsage() returns them in insertion order", async () => {
    await recordUsage(cwd, { provider: "openai", model: "gpt-4o-mini", inputTokens: 10, outputTokens: 5, simulated: false });
    await recordUsage(cwd, { provider: "anthropic", model: "claude-sonnet-5", inputTokens: 20, outputTokens: 8, simulated: false });

    const entries = await listUsage(cwd);
    expect(entries).toHaveLength(2);
    expect(entries[0].provider).toBe("openai");
    expect(entries[1].provider).toBe("anthropic");
    expect(entries[0].timestamp).toBeTruthy();
  });

  it("summarizeUsage() aggregates totals and a per-provider breakdown", async () => {
    await recordUsage(cwd, { provider: "openai", model: "gpt-4o-mini", inputTokens: 10, outputTokens: 5, simulated: false });
    await recordUsage(cwd, { provider: "openai", model: "gpt-4o-mini", inputTokens: 4, outputTokens: 2, simulated: false });
    await recordUsage(cwd, { provider: "anthropic", model: "claude-sonnet-5", inputTokens: 20, outputTokens: 8, simulated: false });

    const summary = summarizeUsage(await listUsage(cwd));

    expect(summary.totalCalls).toBe(3);
    expect(summary.totalInputTokens).toBe(34);
    expect(summary.totalOutputTokens).toBe(15);
    expect(summary.byProvider.openai).toEqual({ calls: 2, inputTokens: 14, outputTokens: 7 });
    expect(summary.byProvider.anthropic).toEqual({ calls: 1, inputTokens: 20, outputTokens: 8 });
  });

  it("persists to .runtime/usage.json under the given cwd", async () => {
    await recordUsage(cwd, { provider: "ollama", model: "llama3", inputTokens: 1, outputTokens: 1, simulated: false });

    const raw = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "usage.json"), "utf-8"));
    expect(Array.isArray(raw)).toBe(true);
    expect(raw).toHaveLength(1);
  });
});
