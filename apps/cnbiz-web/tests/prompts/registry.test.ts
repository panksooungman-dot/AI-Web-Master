import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { addPromptVersion, createPrompt, getLatestVersion, getPrompt, listPrompts } from "../../lib/prompts/registry";

describe("Prompt Library — registry (lib/prompts/registry.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createPrompt() defaults category to 'General' when omitted", async () => {
    const created = await createPrompt("Untitled", "", "content", undefined, undefined, store);
    expect(created.category).toBe("General");
  });

  it("createPrompt() stores category and per-version variables", async () => {
    const created = await createPrompt("Copy", "desc", "Hi {{name}}", "Marketing", ["name"], store);

    expect(created.category).toBe("Marketing");
    expect(getLatestVersion(created).variables).toEqual(["name"]);
  });

  it("listPrompts()/getPrompt() round-trip the same record", async () => {
    const created = await createPrompt("A", "", "content", "General", undefined, store);

    expect(await listPrompts(store)).toHaveLength(1);
    expect((await getPrompt(created.id, store))?.name).toBe("A");
    expect(await getPrompt("does-not-exist", store)).toBeUndefined();
  });

  it("addPromptVersion() preserves version history (regression: existing versioning behavior)", async () => {
    const created = await createPrompt("A", "", "v1 content", "General", undefined, store);
    const updated = await addPromptVersion(created.id, "v2 content", ["x"], store);

    expect(updated?.versions).toHaveLength(2);
    expect(updated?.versions[0].content).toBe("v1 content");
    expect(updated?.versions[1].content).toBe("v2 content");
    expect(updated?.versions[1].variables).toEqual(["x"]);
    expect(getLatestVersion(updated!).version).toBe(2);
  });

  it("addPromptVersion() returns undefined for an unknown prompt id", async () => {
    expect(await addPromptVersion("does-not-exist", "content", undefined, store)).toBeUndefined();
  });

  it("reading legacy records (no category field) defaults category to 'General'", async () => {
    const file = path.join(baseDir, "prompts.json");
    fs.mkdirSync(baseDir, { recursive: true });
    fs.writeFileSync(
      file,
      JSON.stringify([
        {
          id: "prompt-legacy",
          name: "Legacy",
          description: "",
          versions: [{ version: 1, content: "old", createdAt: "2026-01-01T00:00:00.000Z" }],
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ]),
      "utf-8"
    );

    expect((await getPrompt("prompt-legacy", store))?.category).toBe("General");
  });
});
