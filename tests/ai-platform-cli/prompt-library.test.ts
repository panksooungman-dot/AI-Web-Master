import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPrompt, getLatestVersion, getPrompt, listPrompts } from "../../packages/cli/src/promptLibrary/registry.js";

describe("Prompt Library — CLI registry (packages/cli/src/promptLibrary/registry.ts)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-library-cli-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("createPrompt() then listPrompts() round-trips the same record", async () => {
    const created = await createPrompt(cwd, "Website Copy", "desc", "You are a copywriter for {{brand}}.", "Marketing", [
      "brand"
    ]);

    const prompts = await listPrompts(cwd);
    expect(prompts).toHaveLength(1);
    expect(prompts[0].id).toBe(created.id);
    expect(prompts[0].category).toBe("Marketing");
    expect(getLatestVersion(prompts[0]).variables).toEqual(["brand"]);
  });

  it("createPrompt() defaults category to General when omitted", async () => {
    const created = await createPrompt(cwd, "Untitled", "", "content");
    expect(created.category).toBe("General");
  });

  it("listPrompts(cwd, category) filters by category", async () => {
    await createPrompt(cwd, "A", "", "content-a", "Marketing");
    await createPrompt(cwd, "B", "", "content-b", "Engineering");

    const marketing = await listPrompts(cwd, "Marketing");
    expect(marketing).toHaveLength(1);
    expect(marketing[0].name).toBe("A");
  });

  it("getPrompt() finds by id, undefined for unknown id", async () => {
    const created = await createPrompt(cwd, "A", "", "content-a");
    expect((await getPrompt(cwd, created.id))?.name).toBe("A");
    expect(await getPrompt(cwd, "does-not-exist")).toBeUndefined();
  });

  it("writes/reads the same file path Next.js's lib/prompts/registry.ts uses (<cwd>/lib/data/prompts.json)", async () => {
    await createPrompt(cwd, "A", "", "content-a");
    const raw = JSON.parse(fs.readFileSync(path.join(cwd, "lib", "data", "prompts.json"), "utf-8"));
    expect(Array.isArray(raw)).toBe(true);
    expect(raw).toHaveLength(1);
  });
});
