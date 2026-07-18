import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { countActiveSessions, createSession, destroySession, getValidSession } from "../../lib/auth/session";

describe("Auth — session store (lib/auth/session.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-session-test-"));
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createSession() returns a record with a future expiresAt", () => {
    const session = createSession("user-1", baseDir);
    expect(session.userId).toBe("user-1");
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("getValidSession() returns a live session", () => {
    const session = createSession("user-1", baseDir);
    const found = getValidSession(session.id, baseDir);
    expect(found?.id).toBe(session.id);
  });

  it("getValidSession() returns null for an unknown session id", () => {
    expect(getValidSession("does-not-exist", baseDir)).toBeNull();
  });

  it("getValidSession() returns null for an expired session and prunes it", () => {
    const session = createSession("user-1", baseDir);

    // Force expiry directly in the store (createSession() has no custom-TTL param).
    const file = path.join(baseDir, "sessions.json");
    const records = JSON.parse(fs.readFileSync(file, "utf-8"));
    records[0].expiresAt = new Date(Date.now() - 1000).toISOString();
    fs.writeFileSync(file, JSON.stringify(records, null, 2), "utf-8");

    expect(getValidSession(session.id, baseDir)).toBeNull();

    const afterPrune = JSON.parse(fs.readFileSync(file, "utf-8"));
    expect(afterPrune).toHaveLength(0);
  });

  it("destroySession() makes a subsequent lookup return null", () => {
    const session = createSession("user-1", baseDir);
    destroySession(session.id, baseDir);
    expect(getValidSession(session.id, baseDir)).toBeNull();
  });

  describe("countActiveSessions()", () => {
    it("returns 0 when there are no sessions", () => {
      expect(countActiveSessions(baseDir)).toBe(0);
    });

    it("counts only live sessions, pruning expired ones as a side effect", () => {
      createSession("user-1", baseDir);
      const expiring = createSession("user-2", baseDir);

      const file = path.join(baseDir, "sessions.json");
      const records = JSON.parse(fs.readFileSync(file, "utf-8"));
      const target = records.find((r: { id: string }) => r.id === expiring.id);
      target.expiresAt = new Date(Date.now() - 1000).toISOString();
      fs.writeFileSync(file, JSON.stringify(records, null, 2), "utf-8");

      expect(countActiveSessions(baseDir)).toBe(1);

      const afterPrune = JSON.parse(fs.readFileSync(file, "utf-8"));
      expect(afterPrune).toHaveLength(1);
    });
  });
});
