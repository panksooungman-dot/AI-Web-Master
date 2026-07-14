import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getDiskUsage, getSystemInfo, readHealthCache, writeHealthCacheEntry } from "../../lib/health/checks";

describe("Health — checks (lib/health/checks.ts)", () => {
  describe("getDiskUsage()", () => {
    it("returns positive total/free/used byte counts for a real path", () => {
      const usage = getDiskUsage(process.cwd());

      expect(usage.totalBytes).toBeGreaterThan(0);
      expect(usage.freeBytes).toBeGreaterThanOrEqual(0);
      expect(usage.usedBytes).toBe(usage.totalBytes - usage.freeBytes);
    });
  });

  describe("getSystemInfo()", () => {
    it("returns coherent CPU/memory/disk/node/uptime/session data for the real machine", async () => {
      const info = await getSystemInfo(process.cwd());

      expect(info.cpu.cores).toBeGreaterThan(0);
      expect(info.cpu.model.length).toBeGreaterThan(0);
      expect(info.cpu.loadPercent).toBeGreaterThanOrEqual(0);
      expect(info.cpu.loadPercent).toBeLessThanOrEqual(100);

      expect(info.memory.totalBytes).toBeGreaterThan(0);
      expect(info.memory.usedBytes).toBe(info.memory.totalBytes - info.memory.freeBytes);

      expect(info.disk.totalBytes).toBeGreaterThan(0);
      expect(info.nodeVersion).toBe(process.version);
      expect(info.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(info.activeSessions).toBeGreaterThanOrEqual(0);
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
