import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { isUnderGeneratedWebsitesScratch, resolveGeneratedWebsitesDir } from "../../lib/paths/repoRoot";

describe("isUnderGeneratedWebsitesScratch() — lib/paths/repoRoot.ts", () => {
  it("is true for a path computed by resolveGeneratedWebsitesDir()", () => {
    const dir = resolveGeneratedWebsitesDir("design-restaurant");
    expect(isUnderGeneratedWebsitesScratch(dir)).toBe(true);
  });

  it("is true for a nested path further inside the scratch root", () => {
    const dir = path.join(os.tmpdir(), "ai-business-os-cli", "generated-websites", "site", "app", "page.tsx");
    expect(isUnderGeneratedWebsitesScratch(dir)).toBe(true);
  });

  it("is false for an admin-supplied path outside the scratch root", () => {
    expect(isUnderGeneratedWebsitesScratch("/home/user/important-project")).toBe(false);
  });

  it("is false for a path that merely shares the scratch root as a string prefix without being inside it", () => {
    // e.g. os.tmpdir()/ai-business-os-cli-evil should NOT be treated as inside
    // os.tmpdir()/ai-business-os-cli — guards against a naive startsWith() without a trailing separator.
    const lookalike = path.join(os.tmpdir(), "ai-business-os-cli-evil");
    expect(isUnderGeneratedWebsitesScratch(lookalike)).toBe(false);
  });

  it("is false for the scratch root's parent directory", () => {
    expect(isUnderGeneratedWebsitesScratch(os.tmpdir())).toBe(false);
  });
});
