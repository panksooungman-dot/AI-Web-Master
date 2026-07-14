import fs from "fs";
import path from "path";
import crypto from "crypto";
import { hashPassword } from "./password";
import type { UserRecord, PublicUser } from "./types";

const DEFAULT_BASE_DIR = path.join(process.cwd(), "lib", "data");

function registryPath(baseDir: string): string {
  return path.join(baseDir, "users.json");
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

function readRegistry(baseDir: string): UserRecord[] {
  ensureRegistryFile(baseDir);

  try {
    const raw = fs.readFileSync(registryPath(baseDir), "utf-8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as UserRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(baseDir: string, records: UserRecord[]): void {
  ensureRegistryFile(baseDir);
  fs.writeFileSync(registryPath(baseDir), JSON.stringify(records, null, 2), "utf-8");
}

export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email };
}

export function createUser(
  email: string,
  password: string,
  baseDir: string = DEFAULT_BASE_DIR
): UserRecord {
  const normalizedEmail = email.trim().toLowerCase();
  const records = readRegistry(baseDir);

  if (records.some((record) => record.email === normalizedEmail)) {
    throw new Error(`이미 등록된 이메일입니다: ${normalizedEmail}`);
  }

  const record: UserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

export function findUserByEmail(
  email: string,
  baseDir: string = DEFAULT_BASE_DIR
): UserRecord | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return readRegistry(baseDir).find((record) => record.email === normalizedEmail);
}

export function findUserById(
  id: string,
  baseDir: string = DEFAULT_BASE_DIR
): UserRecord | undefined {
  return readRegistry(baseDir).find((record) => record.id === id);
}
