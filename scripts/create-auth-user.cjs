#!/usr/bin/env node
/**
 * Standalone bootstrap script for creating the first login account.
 * There is no signup API by design (out of scope) — this is the only way
 * to create a user. Duplicates the scrypt params from lib/auth/password.ts;
 * keep the two in sync if either changes.
 *
 * Usage: node scripts/create-auth-user.cjs <email> <password> [role]
 * role defaults to "user" (least privilege) — pass one of user|admin|developer|super_admin
 * explicitly to grant dashboard access. See docs/ADMIN_GUIDE.md.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, see screenshot.cjs for the same precedent */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const VALID_ROLES = ["user", "admin", "developer", "super_admin"];

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

function main() {
  const [, , email, password, roleArg] = process.argv;

  if (!email || !password) {
    console.error("사용법: node scripts/create-auth-user.cjs <email> <password> [role]");
    console.error(`role: ${VALID_ROLES.join(" | ")} (기본값: user)`);
    process.exit(1);
  }

  const role = roleArg || "user";
  if (!VALID_ROLES.includes(role)) {
    console.error(`올바르지 않은 role입니다: ${role} (허용값: ${VALID_ROLES.join(", ")})`);
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    console.error("올바른 이메일 형식이 아닙니다.");
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), "lib", "data");
  const usersFile = path.join(dataDir, "users.json");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let users = [];
  if (fs.existsSync(usersFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
      users = Array.isArray(parsed) ? parsed : [];
    } catch {
      users = [];
    }
  }

  if (users.some((user) => user.email === normalizedEmail)) {
    console.error(`이미 등록된 이메일입니다: ${normalizedEmail}`);
    process.exit(1);
  }

  const record = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");

  console.log(`계정이 생성되었습니다: ${normalizedEmail} (role: ${role})`);
}

main();
