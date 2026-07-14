import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getTask, listTasks, recordTask } from "../../packages/cli/src/tasks/ledger.js";

describe("AI Task Runner — CLI ledger (packages/cli/src/tasks/ledger.ts)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "task-ledger-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("listTasks() returns an empty array before anything is recorded", async () => {
    expect(await listTasks(cwd)).toEqual([]);
  });

  it("recordTask() assigns an id/createdAt and persists to .runtime/tasks.json", async () => {
    const recorded = await recordTask(cwd, {
      kind: "chat",
      providerId: "anthropic",
      systemPrompt: "sys",
      userPrompt: "hello",
      status: "success",
      simulated: false,
      result: "hi there"
    });

    expect(recorded.id).toBeTruthy();
    expect(recorded.createdAt).toBeTruthy();

    const raw = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "tasks.json"), "utf-8"));
    expect(raw).toHaveLength(1);
    expect(raw[0].id).toBe(recorded.id);
  });

  it("getTask() finds a recorded entry by id, null for unknown id", async () => {
    const recorded = await recordTask(cwd, {
      kind: "prompt",
      providerId: "openai",
      systemPrompt: "sys",
      userPrompt: "user",
      status: "failed",
      simulated: false,
      error: "boom"
    });

    expect((await getTask(cwd, recorded.id))?.error).toBe("boom");
    expect(await getTask(cwd, "does-not-exist")).toBeNull();
  });

  it("listTasks() returns entries in insertion order (oldest first)", async () => {
    await recordTask(cwd, {
      kind: "chat",
      systemPrompt: "s",
      userPrompt: "first",
      status: "success",
      simulated: true,
      result: "r1"
    });
    await recordTask(cwd, {
      kind: "chat",
      systemPrompt: "s",
      userPrompt: "second",
      status: "success",
      simulated: true,
      result: "r2"
    });

    const entries = await listTasks(cwd);
    expect(entries.map((e) => e.userPrompt)).toEqual(["first", "second"]);
  });
});
