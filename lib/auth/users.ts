import fs from "fs";
import path from "path";
import crypto from "crypto";
import { hashPassword } from "./password";
import type { UserRecord, PublicUser, Role } from "./types";

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

/** Legacy records written before RBAC (release hardening, v1.0) have no `role` field — default
 *  them to the least-privileged role rather than silently granting dashboard access. */
export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, role: user.role ?? "user" };
}

export function createUser(
  email: string,
  password: string,
  role: Role = "user",
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
    role,
    createdAt: new Date().toISOString(),
  };

  records.push(record);
  writeRegistry(baseDir, records);

  return record;
}

/** Promotes/demotes an existing user's role. scripts/set-user-role.cjs is the operator-facing
 *  entry point for this (standalone CJS, same duplication precedent as create-auth-user.cjs) —
 *  this TS function exists for tests and any future in-app admin tooling. */
export function setUserRole(
  email: string,
  role: Role,
  baseDir: string = DEFAULT_BASE_DIR
): UserRecord | null {
  const normalizedEmail = email.trim().toLowerCase();
  const records = readRegistry(baseDir);
  const index = records.findIndex((record) => record.email === normalizedEmail);

  if (index === -1) return null;

  records[index] = { ...records[index], role };
  writeRegistry(baseDir, records);

  return records[index];
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
