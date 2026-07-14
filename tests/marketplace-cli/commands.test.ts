import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalMarketplaceProvider } from "../../packages/cli/src/marketplace/providers/local.js";
import { installPackage, resolveInstallEntry } from "../../packages/cli/src/commands/install.js";
import { removePackage, resolveInstalledPackage } from "../../packages/cli/src/commands/remove.js";
import { updatePackage, updateAllPackages } from "../../packages/cli/src/commands/update.js";
import { publishPackages } from "../../packages/cli/src/commands/publish.js";
import type { PackageManifest } from "../../packages/cli/src/marketplace/types.js";

function writePackage(cwd: string, typeDir: string, name: string, manifest: PackageManifest): string {
  const dir = path.join(cwd, typeDir, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest), "utf-8");
  return dir;
}

describe("Marketplace — command core functions (packages/cli/src/commands/{install,remove,update,publish}.ts)", () => {
  let root: string;
  let cwd: string;
  let provider: LocalMarketplaceProvider;

  const manifest: PackageManifest = {
    name: "my-agent",
    type: "agent",
    version: "1.0.0",
    description: "A test agent",
    author: "Test Author",
    createdAt: "2026-01-01T00:00:00.000Z"
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-cmd-root-"));
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-cmd-cwd-"));
    provider = new LocalMarketplaceProvider(root);
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  describe("publishPackages()", () => {
    it("publishes every discovered local package under cwd", async () => {
      writePackage(cwd, "agents", "my-agent", manifest);

      const outcome = await publishPackages(provider, cwd);

      expect(outcome.published).toHaveLength(1);
      expect(outcome.published[0].name).toBe("my-agent");
      expect(outcome.failed).toHaveLength(0);
    });

    it("returns empty outcome (no crash) when nothing is discovered", async () => {
      const outcome = await publishPackages(provider, cwd);
      expect(outcome).toEqual({ published: [], skipped: [], failed: [] });
    });

    it("republishing the same version is skipped, not failed", async () => {
      writePackage(cwd, "agents", "my-agent", manifest);
      await publishPackages(provider, cwd);
      const outcome = await publishPackages(provider, cwd);

      expect(outcome.published).toHaveLength(0);
      expect(outcome.skipped).toHaveLength(1);
      expect(outcome.failed).toHaveLength(0);
    });
  });

  describe("resolveInstallEntry() / installPackage()", () => {
    it("throws NOT_FOUND for a name that isn't published", async () => {
      expect(() => resolveInstallEntry([], "missing")).toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
    });

    it("throws AMBIGUOUS_PACKAGE when the same name exists under two types without --type", () => {
      const entries = [
        { ...manifest, type: "agent" as const, publishedAt: "x" },
        { ...manifest, type: "workflow" as const, publishedAt: "x" }
      ];
      expect(() => resolveInstallEntry(entries, "my-agent")).toThrow(
        expect.objectContaining({ code: "AMBIGUOUS_PACKAGE" })
      );
      expect(resolveInstallEntry(entries, "my-agent", "workflow").type).toBe("workflow");
    });

    it("installPackage() copies the published package into cwd/agents/<name>, manifest.json included", async () => {
      writePackage(cwd, "agents", "my-agent", manifest);
      await publishPackages(provider, cwd);
      fs.rmSync(path.join(cwd, "agents", "my-agent"), { recursive: true, force: true });

      const result = await installPackage(provider, cwd, "my-agent");

      expect(result.targetDir).toBe(path.join(cwd, "agents", "my-agent"));
      expect(fs.existsSync(path.join(result.targetDir, "manifest.json"))).toBe(true);
    });
  });

  describe("resolveInstalledPackage() / removePackage()", () => {
    it("throws NOT_FOUND when nothing is installed under that name", async () => {
      await expect(removePackage(provider, cwd, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("removes the installed package directory", async () => {
      writePackage(cwd, "agents", "my-agent", manifest);
      await publishPackages(provider, cwd);

      const result = await removePackage(provider, cwd, "my-agent");

      expect(result.targetDir).toBe(path.join(cwd, "agents", "my-agent"));
      expect(fs.existsSync(result.targetDir)).toBe(false);
    });

    it("throws AMBIGUOUS_PACKAGE when the same name is installed under two types without --type", () => {
      const installed = [
        { type: "agent" as const, name: "my-agent", dir: "/a" },
        { type: "workflow" as const, name: "my-agent", dir: "/w" }
      ];
      expect(() => resolveInstalledPackage(installed, "my-agent")).toThrow(
        expect.objectContaining({ code: "AMBIGUOUS_PACKAGE" })
      );
      expect(resolveInstalledPackage(installed, "my-agent", "workflow").dir).toBe("/w");
    });
  });

  describe("updatePackage() / updateAllPackages()", () => {
    it("is a no-op when the installed version already matches the latest published version", async () => {
      writePackage(cwd, "agents", "my-agent", manifest);
      await publishPackages(provider, cwd);

      const result = await updatePackage(provider, cwd, "my-agent");

      expect(result.updated).toBe(false);
      expect(result.from).toBe("1.0.0");
      expect(result.to).toBe("1.0.0");
    });

    it("updates to the newly published version and reports from/to", async () => {
      writePackage(cwd, "agents", "my-agent", manifest);
      await publishPackages(provider, cwd);

      // Bump the source package and republish a newer version (source dir is still the installed one under cwd).
      const bumped = { ...manifest, version: "2.0.0" };
      fs.writeFileSync(path.join(cwd, "agents", "my-agent", "manifest.json"), JSON.stringify(bumped), "utf-8");
      await publishPackages(provider, cwd);
      // Revert the local copy back to the "still installed at 1.0.0" state to simulate a real update scenario.
      fs.writeFileSync(path.join(cwd, "agents", "my-agent", "manifest.json"), JSON.stringify(manifest), "utf-8");

      const result = await updatePackage(provider, cwd, "my-agent");

      expect(result.updated).toBe(true);
      expect(result.from).toBe("1.0.0");
      expect(result.to).toBe("2.0.0");

      const installedManifest = JSON.parse(
        fs.readFileSync(path.join(cwd, "agents", "my-agent", "manifest.json"), "utf-8")
      );
      expect(installedManifest.version).toBe("2.0.0");
    });

    it("throws NOT_FOUND when the installed package is no longer published anywhere", async () => {
      writePackage(cwd, "agents", "orphan", manifest);
      await expect(updatePackage(provider, cwd, "orphan")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("updateAllPackages() updates only the packages that actually have a newer version", async () => {
      writePackage(cwd, "agents", "current-agent", manifest);
      writePackage(cwd, "agents", "stale-agent", { ...manifest, name: "stale-agent" });
      await publishPackages(provider, cwd);

      const bumped = { ...manifest, name: "stale-agent", version: "1.5.0" };
      fs.writeFileSync(path.join(cwd, "agents", "stale-agent", "manifest.json"), JSON.stringify(bumped), "utf-8");
      await publishPackages(provider, cwd);
      fs.writeFileSync(
        path.join(cwd, "agents", "stale-agent", "manifest.json"),
        JSON.stringify({ ...manifest, name: "stale-agent" }),
        "utf-8"
      );

      const results = await updateAllPackages(provider, cwd);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("stale-agent");
      expect(results[0].to).toBe("1.5.0");
    });
  });

  it("full lifecycle: publish → install → update (no-op) → bump+republish → update (applies) → remove", async () => {
    writePackage(cwd, "agents", "my-agent", manifest);
    await publishPackages(provider, cwd);
    fs.rmSync(path.join(cwd, "agents", "my-agent"), { recursive: true, force: true });

    const installed = await installPackage(provider, cwd, "my-agent");
    expect(fs.existsSync(installed.targetDir)).toBe(true);

    const noop = await updatePackage(provider, cwd, "my-agent");
    expect(noop.updated).toBe(false);

    // Publish v2 from a fresh source, independent of the installed copy.
    const sourceV2 = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-cmd-source-v2-"));
    fs.writeFileSync(path.join(sourceV2, "manifest.json"), JSON.stringify({ ...manifest, version: "2.0.0" }), "utf-8");
    await provider.publish(sourceV2, { ...manifest, version: "2.0.0" });
    fs.rmSync(sourceV2, { recursive: true, force: true });

    const applied = await updatePackage(provider, cwd, "my-agent");
    expect(applied.updated).toBe(true);
    expect(applied.to).toBe("2.0.0");

    const removed = await removePackage(provider, cwd, "my-agent");
    expect(fs.existsSync(removed.targetDir)).toBe(false);
  });
});
