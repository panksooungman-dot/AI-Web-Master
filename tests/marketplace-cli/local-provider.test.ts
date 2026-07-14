import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalMarketplaceProvider } from "../../packages/cli/src/marketplace/providers/local.js";
import type { PackageManifest } from "../../packages/cli/src/marketplace/types.js";

const MANIFEST: PackageManifest = {
  name: "my-agent",
  type: "agent",
  version: "1.0.0",
  description: "A test agent",
  author: "Test Author",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("Marketplace — LocalMarketplaceProvider (packages/cli/src/marketplace/providers/local.ts)", () => {
  let root: string;
  let sourceDir: string;
  let provider: LocalMarketplaceProvider;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-provider-root-"));
    sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-provider-source-"));
    fs.writeFileSync(path.join(sourceDir, "manifest.json"), JSON.stringify(MANIFEST), "utf-8");
    fs.writeFileSync(path.join(sourceDir, "AGENT.md"), "# my-agent", "utf-8");
    provider = new LocalMarketplaceProvider(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(sourceDir, { recursive: true, force: true });
  });

  it("list() is empty before anything is published", async () => {
    expect(await provider.list()).toEqual([]);
  });

  it("publish() then list() round-trips the entry with a publishedAt timestamp", async () => {
    const entry = await provider.publish(sourceDir, MANIFEST);
    expect(entry.name).toBe("my-agent");
    expect(entry.publishedAt).toBeTruthy();

    const listed = await provider.list();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(entry);
  });

  it("publish() copies the source files into marketplace/<type>s/<name>", async () => {
    await provider.publish(sourceDir, MANIFEST);
    const publishedDir = provider.packageDir("agent", "my-agent");

    expect(fs.existsSync(path.join(publishedDir, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(publishedDir, "AGENT.md"))).toBe(true);
  });

  it("republishing the same version throws ALREADY_PUBLISHED", async () => {
    await provider.publish(sourceDir, MANIFEST);
    await expect(provider.publish(sourceDir, MANIFEST)).rejects.toMatchObject({ code: "ALREADY_PUBLISHED" });
  });

  it("republishing a bumped version succeeds and replaces the entry", async () => {
    await provider.publish(sourceDir, MANIFEST);
    const bumped = { ...MANIFEST, version: "1.1.0" };
    const entry = await provider.publish(sourceDir, bumped);

    expect(entry.version).toBe("1.1.0");
    const listed = await provider.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].version).toBe("1.1.0");
  });

  it("list() filters by type and keyword", async () => {
    await provider.publish(sourceDir, MANIFEST);

    expect(await provider.list({ type: "workflow" })).toEqual([]);
    expect(await provider.list({ type: "agent" })).toHaveLength(1);
    expect(await provider.list({ keyword: "test agent" })).toHaveLength(1);
    expect(await provider.list({ keyword: "no match" })).toEqual([]);
  });

  describe("install() / uninstall()", () => {
    it("install() throws NOT_FOUND for an unpublished package", async () => {
      const targetDir = path.join(root, "target");
      await expect(provider.install("agent", "my-agent", targetDir)).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("install() copies the published package (including manifest.json) into targetDir", async () => {
      await provider.publish(sourceDir, MANIFEST);
      const targetDir = path.join(root, "..", "installed-target");

      await provider.install("agent", "my-agent", targetDir);

      expect(fs.existsSync(path.join(targetDir, "manifest.json"))).toBe(true);
      const installedManifest = JSON.parse(fs.readFileSync(path.join(targetDir, "manifest.json"), "utf-8"));
      expect(installedManifest.version).toBe("1.0.0");

      fs.rmSync(targetDir, { recursive: true, force: true });
    });

    it("install() throws DUPLICATE_PACKAGE if targetDir already exists", async () => {
      await provider.publish(sourceDir, MANIFEST);
      const targetDir = path.join(root, "..", "dup-target");
      fs.mkdirSync(targetDir, { recursive: true });

      await expect(provider.install("agent", "my-agent", targetDir)).rejects.toMatchObject({
        code: "DUPLICATE_PACKAGE",
      });

      fs.rmSync(targetDir, { recursive: true, force: true });
    });

    it("uninstall() removes an installed targetDir", async () => {
      await provider.publish(sourceDir, MANIFEST);
      const targetDir = path.join(root, "..", "uninstall-target");
      await provider.install("agent", "my-agent", targetDir);
      expect(fs.existsSync(targetDir)).toBe(true);

      await provider.uninstall("agent", "my-agent", targetDir);
      expect(fs.existsSync(targetDir)).toBe(false);
    });

    it("uninstall() throws NOT_FOUND if targetDir does not exist", async () => {
      const targetDir = path.join(root, "..", "never-installed");
      await expect(provider.uninstall("agent", "my-agent", targetDir)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  });
});
