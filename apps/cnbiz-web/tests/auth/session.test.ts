import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { countActiveSessions, createSession, destroySession, getValidSession } from "../../lib/auth/session";
import { createFsStore } from "../../lib/db/fsStore";

describe("Auth — session store (lib/auth/session.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "auth-session-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  it("createSession() returns a record with a future expiresAt", async () => {
    const session = await createSession("user-1", store);
    expect(session.userId).toBe("user-1");
    expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("getValidSession() returns a live session", async () => {
    const session = await createSession("user-1", store);
    const found = await getValidSession(session.id, store);
    expect(found?.id).toBe(session.id);
  });

  it("getValidSession() returns null for an unknown session id", async () => {
    expect(await getValidSession("does-not-exist", store)).toBeNull();
  });

  it("getValidSession() returns null for an expired session and prunes it", async () => {
    const session = await createSession("user-1", store);

    // Force expiry directly in the store (createSession() has no custom-TTL param).
    const file = path.join(baseDir, "sessions.json");
    const records = JSON.parse(fs.readFileSync(file, "utf-8"));
    records[0].expiresAt = new Date(Date.now() - 1000).toISOString();
    fs.writeFileSync(file, JSON.stringify(records, null, 2), "utf-8");

    expect(await getValidSession(session.id, store)).toBeNull();

    const afterPrune = JSON.parse(fs.readFileSync(file, "utf-8"));
    expect(afterPrune).toHaveLength(0);
  });

  it("destroySession() makes a subsequent lookup return null", async () => {
    const session = await createSession("user-1", store);
    await destroySession(session.id, store);
    expect(await getValidSession(session.id, store)).toBeNull();
  });

  describe("countActiveSessions()", () => {
    it("returns 0 when there are no sessions", async () => {
      expect(await countActiveSessions(store)).toBe(0);
    });

    it("counts only live sessions, pruning expired ones as a side effect", async () => {
      await createSession("user-1", store);
      const expiring = await createSession("user-2", store);

      const file = path.join(baseDir, "sessions.json");
      const records = JSON.parse(fs.readFileSync(file, "utf-8"));
      const target = records.find((r: { id: string }) => r.id === expiring.id);
      target.expiresAt = new Date(Date.now() - 1000).toISOString();
      fs.writeFileSync(file, JSON.stringify(records, null, 2), "utf-8");

      expect(await countActiveSessions(store)).toBe(1);

      const afterPrune = JSON.parse(fs.readFileSync(file, "utf-8"));
      expect(afterPrune).toHaveLength(1);
    });
  });
});
