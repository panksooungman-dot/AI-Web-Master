import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addPromptVersion, createPrompt, getLatestVersion, getPrompt, listPrompts } from "../../lib/prompts/registry";

describe("Prompt Library — registry (lib/prompts/registry.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "prompts-registry-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createPrompt() defaults category to 'General' when omitted", () => {
    const created = createPrompt("Untitled", "", "content", undefined, undefined, baseDir);
    expect(created.category).toBe("General");
  });

  it("createPrompt() stores category and per-version variables", () => {
    const created = createPrompt("Copy", "desc", "Hi {{name}}", "Marketing", ["name"], baseDir);

    expect(created.category).toBe("Marketing");
    expect(getLatestVersion(created).variables).toEqual(["name"]);
  });

  it("listPrompts()/getPrompt() round-trip the same record", () => {
    const created = createPrompt("A", "", "content", "General", undefined, baseDir);

    expect(listPrompts(baseDir)).toHaveLength(1);
    expect(getPrompt(created.id, baseDir)?.name).toBe("A");
    expect(getPrompt("does-not-exist", baseDir)).toBeUndefined();
  });

  it("addPromptVersion() preserves version history (regression: existing versioning behavior)", () => {
    const created = createPrompt("A", "", "v1 content", "General", undefined, baseDir);
    const updated = addPromptVersion(created.id, "v2 content", ["x"], baseDir);

    expect(updated?.versions).toHaveLength(2);
    expect(updated?.versions[0].content).toBe("v1 content");
    expect(updated?.versions[1].content).toBe("v2 content");
    expect(updated?.versions[1].variables).toEqual(["x"]);
    expect(getLatestVersion(updated!).version).toBe(2);
  });

  it("addPromptVersion() returns undefined for an unknown prompt id", () => {
    expect(addPromptVersion("does-not-exist", "content", undefined, baseDir)).toBeUndefined();
  });

  it("reading legacy records (no category field) defaults category to 'General'", () => {
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

    expect(getPrompt("prompt-legacy", baseDir)?.category).toBe("General");
  });
});
