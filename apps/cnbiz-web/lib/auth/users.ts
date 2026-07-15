import crypto from "crypto";
import { hashPassword } from "./password";
import type { UserRecord, PublicUser, Role } from "./types";
import type { CollectionStore } from "@/lib/db/collectionStore";
import { getDefaultStore } from "@/lib/db";

const COLLECTION = "users";

/** Legacy records written before RBAC (release hardening, v1.0) have no `role` field — default
 *  them to the least-privileged role rather than silently granting dashboard access. */
export function toPublicUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, role: user.role ?? "user" };
}

export async function createUser(
  email: string,
  password: string,
  role: Role = "user",
  store: CollectionStore = getDefaultStore()
): Promise<UserRecord> {
  const normalizedEmail = email.trim().toLowerCase();
  const records = await store.list<UserRecord>(COLLECTION);

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
  await store.replaceAll(COLLECTION, records);

  return record;
}

/** Promotes/demotes an existing user's role. scripts/set-user-role.cjs is the operator-facing
 *  entry point for this (standalone CJS, same duplication precedent as create-auth-user.cjs) —
 *  this TS function exists for tests and any future in-app admin tooling. */
export async function setUserRole(
  email: string,
  role: Role,
  store: CollectionStore = getDefaultStore()
): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const records = await store.list<UserRecord>(COLLECTION);
  const index = records.findIndex((record) => record.email === normalizedEmail);

  if (index === -1) return null;

  records[index] = { ...records[index], role };
  await store.replaceAll(COLLECTION, records);

  return records[index];
}

export async function findUserByEmail(
  email: string,
  store: CollectionStore = getDefaultStore()
): Promise<UserRecord | undefined> {
  const normalizedEmail = email.trim().toLowerCase();
  const records = await store.list<UserRecord>(COLLECTION);
  return records.find((record) => record.email === normalizedEmail);
}

export async function findUserById(
  id: string,
  store: CollectionStore = getDefaultStore()
): Promise<UserRecord | undefined> {
  const records = await store.list<UserRecord>(COLLECTION);
  return records.find((record) => record.id === id);
}
