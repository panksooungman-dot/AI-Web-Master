import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readManifest, validateManifest } from "../../packages/cli/src/marketplace/manifest.js";
import { MarketplaceError } from "../../packages/cli/src/marketplace/types.js";

const VALID_MANIFEST = {
  name: "my-agent",
  type: "agent",
  version: "1.0.0",
  description: "A test agent",
  author: "Test Author",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("Marketplace — manifest validation (packages/cli/src/marketplace/manifest.ts)", () => {
  describe("validateManifest()", () => {
    it("accepts a well-formed manifest", () => {
      const result = validateManifest(VALID_MANIFEST, "test");
      expect(result).toEqual(VALID_MANIFEST);
    });

    it("rejects a non-object payload", () => {
      expect(() => validateManifest(null, "test")).toThrow(MarketplaceError);
      expect(() => validateManifest("not an object", "test")).toThrow(MarketplaceError);
    });

    it("rejects a manifest missing required fields", () => {
      const missingDescription = { ...VALID_MANIFEST, description: undefined };
      try {
        validateManifest(missingDescription, "test");
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MarketplaceError);
        expect((error as MarketplaceError).code).toBe("INVALID_MANIFEST");
      }
    });

    it.each(["../../etc", "../escape", "has spaces", "has/slash", ""])(
      "rejects an unsafe package name %j (path-traversal guard)",
      (name) => {
        try {
          validateManifest({ ...VALID_MANIFEST, name }, "test");
          expect.unreachable("should have thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(MarketplaceError);
          expect((error as MarketplaceError).code).toBe("INVALID_MANIFEST");
        }
      }
    );

    it("accepts safe name variants (letters, digits, hyphen, underscore)", () => {
      expect(() => validateManifest({ ...VALID_MANIFEST, name: "my-agent_2" }, "test")).not.toThrow();
    });

    it("rejects an unknown type", () => {
      try {
        validateManifest({ ...VALID_MANIFEST, type: "prompt" }, "test");
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MarketplaceError);
        expect((error as MarketplaceError).code).toBe("INVALID_MANIFEST");
      }
    });

    it("rejects a non-semver version", () => {
      try {
        validateManifest({ ...VALID_MANIFEST, version: "v1" }, "test");
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MarketplaceError);
        expect((error as MarketplaceError).code).toBe("INVALID_MANIFEST");
      }
    });
  });

  describe("readManifest()", () => {
    let dir: string;

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-manifest-test-"));
    });

    afterEach(() => {
      fs.rmSync(dir, { recursive: true, force: true });
    });

    it("reads and validates manifest.json from a package directory", async () => {
      fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(VALID_MANIFEST), "utf-8");

      const result = await readManifest(dir);
      expect(result).toEqual(VALID_MANIFEST);
    });

    it("throws NOT_FOUND when manifest.json is missing", async () => {
      await expect(readManifest(dir)).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
