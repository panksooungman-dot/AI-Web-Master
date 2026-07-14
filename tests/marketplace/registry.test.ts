import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCatalogSummary, listInstalled, setInstalled } from "../../lib/marketplace/registry";

describe("Marketplace — registry (lib/marketplace/registry.ts)", () => {
  describe("getCatalogSummary()", () => {
    let manifestPath: string;
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-manifest-test-"));
      manifestPath = path.join(tmpDir, "manifest.json");
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("parses category counts from a fixture manifest", () => {
      fs.writeFileSync(
        manifestPath,
        JSON.stringify({
          packages: {
            agents: { count: 2, description: "Reusable AI Agent packages." },
            workflows: { count: 1, description: "Reusable workflow packages." },
          },
        }),
        "utf-8"
      );

      const summary = getCatalogSummary(manifestPath);

      expect(summary.totalAvailable).toBe(3);
      expect(summary.categories).toEqual([
        { id: "agents", description: "Reusable AI Agent packages.", count: 2 },
        { id: "workflows", description: "Reusable workflow packages.", count: 1 },
      ]);
    });

    it("returns an empty, zero-total summary when the manifest is missing or invalid", () => {
      expect(getCatalogSummary(path.join(tmpDir, "does-not-exist.json"))).toEqual({
        categories: [],
        totalAvailable: 0,
      });

      fs.writeFileSync(manifestPath, "not json", "utf-8");
      expect(getCatalogSummary(manifestPath)).toEqual({ categories: [], totalAvailable: 0 });
    });

    it("reflects the repo's real root manifest.json (currently 0 packages in every category)", () => {
      const realManifestPath = path.join(process.cwd(), "marketplace", "manifest.json");
      const summary = getCatalogSummary(realManifestPath);

      expect(summary.categories.length).toBeGreaterThan(0);
      expect(summary.totalAvailable).toBe(0);
    });
  });

  describe("listInstalled() / setInstalled()", () => {
    let baseDir: string;

    beforeEach(() => {
      baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-installed-test-"));
    });

    afterEach(() => {
      fs.rmSync(baseDir, { recursive: true, force: true });
    });

    it("starts empty", () => {
      expect(listInstalled(baseDir)).toEqual([]);
    });

    it("setInstalled(name, true) adds the package; listInstalled() reflects it", () => {
      setInstalled("my-agent", true, baseDir);
      const installed = listInstalled(baseDir);

      expect(installed).toHaveLength(1);
      expect(installed[0].name).toBe("my-agent");
    });

    it("setInstalled(name, true) twice does not duplicate the entry", () => {
      setInstalled("my-agent", true, baseDir);
      setInstalled("my-agent", true, baseDir);

      expect(listInstalled(baseDir)).toHaveLength(1);
    });

    it("setInstalled(name, false) removes the package", () => {
      setInstalled("my-agent", true, baseDir);
      setInstalled("my-agent", false, baseDir);

      expect(listInstalled(baseDir)).toEqual([]);
    });
  });
});
