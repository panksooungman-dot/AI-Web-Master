import { describe, expect, it, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { FileSystem } from "../../packages/cli/src/utils/filesystem.js";
import { findProjectRoot } from "../../packages/cli/src/utils/config.js";

describe("CLI Utilities — FileSystem", () => {
  const sandboxes: string[] = [];

  afterEach(async () => {
    await Promise.all(sandboxes.splice(0).map((dir) => fs.remove(dir)));
  });

  async function makeSandbox(): Promise<string> {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-business-os-fs-test-"));
    sandboxes.push(dir);
    return dir;
  }

  it("exists() reflects real filesystem state before and after ensureDirectory()", async () => {
    const root = await makeSandbox();
    const target = path.join(root, "nested", "dir");

    expect(await FileSystem.exists(target)).toBe(false);

    await FileSystem.ensureDirectory(target);

    expect(await FileSystem.exists(target)).toBe(true);
  });

  it("writeJson()/readJson() round-trip real data on disk", async () => {
    const root = await makeSandbox();
    const file = path.join(root, "data.json");

    await FileSystem.writeJson(file, { name: "ai-business-os", count: 3 });
    const result = await FileSystem.readJson<{ name: string; count: number }>(file);

    expect(result).toEqual({ name: "ai-business-os", count: 3 });
  });

  it("writeText()/readText() round-trip real data on disk", async () => {
    const root = await makeSandbox();
    const file = path.join(root, "note.txt");

    await FileSystem.writeText(file, "hello world");

    expect(await FileSystem.readText(file)).toBe("hello world");
  });

  it("list() returns [] for a missing directory instead of throwing", async () => {
    const root = await makeSandbox();
    const missing = path.join(root, "does-not-exist");

    await expect(FileSystem.list(missing)).resolves.toEqual([]);
  });

  it("list() returns real directory entries once files exist", async () => {
    const root = await makeSandbox();
    await FileSystem.writeText(path.join(root, "a.txt"), "a");
    await FileSystem.writeText(path.join(root, "b.txt"), "b");

    const entries = await FileSystem.list(root);

    expect(entries.sort()).toEqual(["a.txt", "b.txt"]);
  });

  it("remove() deletes an existing path and is a no-op when the path is already gone", async () => {
    const root = await makeSandbox();
    const file = path.join(root, "gone.txt");
    await FileSystem.writeText(file, "bye");

    await FileSystem.remove(file);
    expect(await FileSystem.exists(file)).toBe(false);

    await expect(FileSystem.remove(file)).resolves.not.toThrow();
  });
});

describe("CLI Utilities — findProjectRoot", () => {
  it("walks up from a nested cwd to the repo root containing .git and packages/", async () => {
    const nestedStart = path.resolve(__dirname, "../../packages/cli/src/commands");

    const root = await findProjectRoot(nestedStart);

    expect(await fs.pathExists(path.join(root, ".git"))).toBe(true);
    expect(await fs.pathExists(path.join(root, "packages"))).toBe(true);
  });

  it("throws once it walks past the filesystem root without finding a project", async () => {
    const outsideRepo = os.tmpdir();

    // os.tmpdir()이 우연히 .git+packages를 모두 가진 상위 트리 안에 있지 않은 한 실패해야 한다.
    await expect(findProjectRoot(outsideRepo)).rejects.toThrow("AI Business OS project root not found.");
  });
});
