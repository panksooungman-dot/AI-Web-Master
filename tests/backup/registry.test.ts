import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { exportBackup, importBackup } from "../../lib/backup/registry";

describe("Backup — lib/backup/registry.ts", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "backup-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  describe("exportBackup()", () => {
    it("returns null configuration and empty arrays when nothing exists yet", () => {
      const bundle = exportBackup(cwd);

      expect(bundle.version).toBe(1);
      expect(bundle.configuration).toBeNull();
      expect(bundle.prompts).toEqual([]);
      expect(bundle.workflows).toEqual([]);
      expect(new Date(bundle.exportedAt).getTime()).not.toBeNaN();
    });

    it("reads real configuration/prompts/workflows files when present", () => {
      const configDir = path.join(cwd, ".runtime", "config");
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(
        path.join(configDir, "providers.json"),
        JSON.stringify({ default: "anthropic", providers: { anthropic: { apiKey: "${ANTHROPIC_API_KEY}" } } })
      );

      const dataDir = path.join(cwd, "lib", "data");
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(path.join(dataDir, "prompts.json"), JSON.stringify([{ id: "p1", name: "Prompt 1" }]));
      fs.writeFileSync(path.join(dataDir, "workflows.json"), JSON.stringify([{ id: "w1", name: "Workflow 1" }]));

      const bundle = exportBackup(cwd);

      expect(bundle.configuration).toEqual({ default: "anthropic", providers: { anthropic: { apiKey: "${ANTHROPIC_API_KEY}" } } });
      expect(bundle.prompts).toEqual([{ id: "p1", name: "Prompt 1" }]);
      expect(bundle.workflows).toEqual([{ id: "w1", name: "Workflow 1" }]);
    });
  });

  describe("importBackup()", () => {
    it("rejects a non-object bundle", () => {
      const result = importBackup("not an object", cwd);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("restores configuration/prompts/workflows from a full bundle", () => {
      const bundle = {
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        configuration: { default: "openai", providers: {} },
        prompts: [{ id: "p1", name: "Restored Prompt" }],
        workflows: [{ id: "w1", name: "Restored Workflow" }],
      };

      const result = importBackup(bundle, cwd);

      expect(result.success).toBe(true);
      expect(result.imported).toEqual({ configuration: true, prompts: 1, workflows: 1 });

      const roundTrip = exportBackup(cwd);
      expect(roundTrip.configuration).toEqual(bundle.configuration);
      expect(roundTrip.prompts).toEqual(bundle.prompts);
      expect(roundTrip.workflows).toEqual(bundle.workflows);
    });

    it("supports a partial bundle — only restores the sections present", () => {
      const result = importBackup({ prompts: [{ id: "p1" }] }, cwd);

      expect(result.success).toBe(true);
      expect(result.imported).toEqual({ configuration: false, prompts: 1, workflows: 0 });

      const roundTrip = exportBackup(cwd);
      expect(roundTrip.prompts).toEqual([{ id: "p1" }]);
      expect(roundTrip.configuration).toBeNull();
      expect(roundTrip.workflows).toEqual([]);
    });
  });
});
