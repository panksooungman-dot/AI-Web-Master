import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDiskUsage, readHealthCache, writeHealthCacheEntry } from "../../lib/health/checks";

describe("Health — checks (lib/health/checks.ts)", () => {
  describe("getDiskUsage()", () => {
    it("returns positive total/free/used byte counts for a real path", () => {
      const usage = getDiskUsage(process.cwd());

      expect(usage.totalBytes).toBeGreaterThan(0);
      expect(usage.freeBytes).toBeGreaterThanOrEqual(0);
      expect(usage.usedBytes).toBe(usage.totalBytes - usage.freeBytes);
    });
  });

  describe("readHealthCache() / writeHealthCacheEntry()", () => {
    let baseDir: string;

    beforeEach(() => {
      baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "health-cache-test-"));
    });

    afterEach(() => {
      fs.rmSync(baseDir, { recursive: true, force: true });
    });

    it("starts empty", () => {
      expect(readHealthCache(baseDir)).toEqual({});
    });

    it("writeHealthCacheEntry() persists a check result, readable back", () => {
      const result = { success: true, summary: "성공", ranAt: new Date().toISOString(), durationMs: 1234 };

      writeHealthCacheEntry("build", result, baseDir);

      expect(readHealthCache(baseDir)).toEqual({ build: result });
    });

    it("writing a second check preserves the first", () => {
      const build = { success: true, summary: "성공", ranAt: new Date().toISOString(), durationMs: 100 };
      const test = { success: false, summary: "실패", ranAt: new Date().toISOString(), durationMs: 200 };

      writeHealthCacheEntry("build", build, baseDir);
      writeHealthCacheEntry("test", test, baseDir);

      expect(readHealthCache(baseDir)).toEqual({ build, test });
    });

    it("re-writing the same check overwrites its previous result", () => {
      const first = { success: false, summary: "실패", ranAt: new Date().toISOString(), durationMs: 100 };
      const second = { success: true, summary: "성공", ranAt: new Date().toISOString(), durationMs: 150 };

      writeHealthCacheEntry("test", first, baseDir);
      writeHealthCacheEntry("test", second, baseDir);

      expect(readHealthCache(baseDir)).toEqual({ test: second });
    });
  });
});
