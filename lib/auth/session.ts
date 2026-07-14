import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { SessionRecord } from "./types";

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

export const SESSION_COOKIE_NAME = "ai_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function registryPath(baseDir: string): string {
  return path.join(baseDir, "sessions.json");
}

function ensureRegistryFile(baseDir: string): void {
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }

  const file = registryPath(baseDir);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, "[]", "utf-8");
  }
}

function readRegistry(baseDir: string): SessionRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: SessionRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

export function createSession(
  userId: string,
  baseDir: string = DEFAULT_BASE_DIR
): SessionRecord {
  const now = Date.now();
  const record: SessionRecord = {
    id: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };

  const records = readRegistry(baseDir);
  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

/**
 * Returns the session if it exists and hasn't expired. Expired sessions are
 * pruned from the store as a side effect (lazy cleanup, no cron needed).
 */
export function getValidSession(
  sessionId: string,
  baseDir: string = DEFAULT_BASE_DIR
): SessionRecord | null {
  const records = readRegistry(baseDir);
  const now = Date.now();
  const live = records.filter((record) => new Date(record.expiresAt).getTime() > now);

  if (live.length !== records.length) {
    writeRegistry(baseDir, live);
  }

  return live.find((record) => record.id === sessionId) ?? null;
}

export function destroySession(sessionId: string, baseDir: string = DEFAULT_BASE_DIR): void {
  const records = readRegistry(baseDir);
  const remaining = records.filter((record) => record.id !== sessionId);

  if (remaining.length !== records.length) {
    writeRegistry(baseDir, remaining);
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
