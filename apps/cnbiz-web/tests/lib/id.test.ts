import { describe, expect, it } from "vitest";
import { generateId } from "../../lib/id";

describe("generateId — lib/id.ts", () => {
  it("prefixes the id with the given prefix", () => {
    expect(generateId("prompt")).toMatch(/^prompt-/);
  });

  it("never collides across a large batch of calls made back-to-back (same millisecond risk)", () => {
    const ids = Array.from({ length: 10_000 }, () => generateId("id"));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
