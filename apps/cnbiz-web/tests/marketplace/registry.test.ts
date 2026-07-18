import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCatalogSummary } from "../../lib/marketplace/registry";

describe("Marketplace — dashboard bridge, catalog summary (lib/marketplace/registry.ts)", () => {
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

    it("reflects the repo's real root manifest.json", () => {
      // Not pinned to a specific totalAvailable — the real marketplace/manifest.json's per-category
      // counts change as packages are published (see docs/PRODUCTION_VALIDATION.md), so this only
      // checks that getCatalogSummary() can read the real file and produces a coherent, non-negative
      // structure rather than snapshotting a transient repo state as a permanent invariant.
      const realManifestPath = path.join(process.cwd(), "marketplace", "manifest.json");
      const summary = getCatalogSummary(realManifestPath);

      expect(summary.categories.length).toBeGreaterThan(0);
      expect(summary.totalAvailable).toBeGreaterThanOrEqual(0);
      expect(summary.categories.every((category) => category.count >= 0)).toBe(true);
    });
  });
});
