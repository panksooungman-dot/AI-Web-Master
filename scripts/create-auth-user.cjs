#!/usr/bin/env node
/**
 * Standalone bootstrap script for creating the first login account.
 * There is no signup API by design (out of scope) — this is the only way
 * to create a user. Duplicates the scrypt params from lib/auth/password.ts;
 * keep the two in sync if either changes.
 *
 * Usage: node scripts/create-auth-user.cjs <email> <password>
 */
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, see screenshot.cjs for the same precedent */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

function main() {
  const [, , email, password] = process.argv;

  if (!email || !password) {
    console.error("사용법: node scripts/create-auth-user.cjs <email> <password>");
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
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");

  console.log(`계정이 생성되었습니다: ${normalizedEmail}`);
}

main();
