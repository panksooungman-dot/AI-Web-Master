import crypto from "crypto";
import type { SessionRecord } from "./types";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

const COLLECTION = "sessions";

export const SESSION_COOKIE_NAME = "ai_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createSession(
  userId: string,
  store: CollectionStore = getDefaultStore()
): Promise<SessionRecord> {
  const now = Date.now();
  const record: SessionRecord = {
    id: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };

  const records = await store.list<SessionRecord>(COLLECTION);
  records.push(record);
  await store.replaceAll(COLLECTION, records);

  return record;
}

/**
 * Returns the session if it exists and hasn't expired. Expired sessions are
 * pruned from the store as a side effect (lazy cleanup, no cron needed).
 */
export async function getValidSession(
  sessionId: string,
  store: CollectionStore = getDefaultStore()
): Promise<SessionRecord | null> {
  const records = await store.list<SessionRecord>(COLLECTION);
  const now = Date.now();
  const live = records.filter((record) => new Date(record.expiresAt).getTime() > now);

  if (live.length !== records.length) {
    await store.replaceAll(COLLECTION, live);
  }

  return live.find((record) => record.id === sessionId) ?? null;
}

/** 요구사항 — Health Dashboard의 "Active sessions". 만료된 세션은 집계에서 제외(부작용으로 정리도 함께 수행). */
export async function countActiveSessions(store: CollectionStore = getDefaultStore()): Promise<number> {
  const records = await store.list<SessionRecord>(COLLECTION);
  const now = Date.now();
  const live = records.filter((record) => new Date(record.expiresAt).getTime() > now);

  if (live.length !== records.length) {
    await store.replaceAll(COLLECTION, live);
  }

  return live.length;
}

export async function destroySession(
  sessionId: string,
  store: CollectionStore = getDefaultStore()
): Promise<void> {
  const records = await store.list<SessionRecord>(COLLECTION);
  const remaining = records.filter((record) => record.id !== sessionId);

  if (remaining.length !== records.length) {
    await store.replaceAll(COLLECTION, remaining);
  }
}

export function sessionCookieOptions(expiresAt: string): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  expires: Date;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  };
}
