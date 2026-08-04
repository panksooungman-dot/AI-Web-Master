/**
 * RBAC roles (release hardening, v1.0). Order is least → most privileged; see
 * lib/auth/rbac.ts for the actual access matrix. "user" is the default for
 * newly created accounts and for legacy records that predate this field.
 * "customer" (Customer Portal V1) is a separate, parallel area — not more or less privileged
 * than "user", just scoped to its own /customer/** area (see lib/auth/rbac.ts).
 */
export type Role = "user" | "admin" | "developer" | "super_admin" | "customer";

export const ROLES: Role[] = ["user", "admin", "developer", "super_admin", "customer"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as string[]).includes(value);
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  role: Role;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}
