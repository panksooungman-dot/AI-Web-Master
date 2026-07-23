#!/usr/bin/env node
/**
 * Standalone script to reset an existing login account's password
 * (role is left untouched). Same standalone-CommonJS precedent as
 * scripts/create-auth-user.cjs / scripts/set-user-role.cjs (see those files'
 * header comments, including the Supabase-vs-fs storage note). Duplicates the
 * scrypt params from lib/auth/password.ts; keep in sync if either changes.
 *
 * Usage: node scripts/reset-user-password.cjs <email> <newPassword>
 *
 * fs fallback targets os.tmpdir()/cnbiz-web/data (matches lib/db/fsStore.ts's
 * DEFAULT_BASE_DIR, not lib/data — see create-auth-user.cjs's header comment).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, see screenshot.cjs for the same precedent */
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

async function resetPasswordViaSupabase(normalizedEmail, passwordHash) {
  const { createClient } = require("@supabase/supabase-js");
  const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client
    .from("app_collections")
    .select("id, data")
    .eq("collection", "users");
  if (error) throw new Error(`Supabase select 실패: ${error.message}`);

  const row = (data ?? []).find((r) => r.data && r.data.email === normalizedEmail);
  if (!row) {
    console.error(`등록되지 않은 이메일입니다: ${normalizedEmail}`);
    process.exit(1);
  }

  const updated = { ...row.data, passwordHash };

  const { error: updateError } = await client
    .from("app_collections")
    .update({ data: updated })
    .eq("collection", "users")
    .eq("id", row.id);
  if (updateError) throw new Error(`Supabase update 실패: ${updateError.message}`);

  console.log(`[Supabase] 비밀번호가 재설정되었습니다: ${normalizedEmail} (role: ${updated.role ?? "user"})`);
}

function resetPasswordViaFs(normalizedEmail, passwordHash) {
  const usersFile = path.join(os.tmpdir(), "cnbiz-web", "data", "users.json");

  if (!fs.existsSync(usersFile)) {
    console.error(`사용자 저장소(${usersFile})가 없습니다. 먼저 계정을 생성하세요.`);
    process.exit(1);
  }

  let users;
  try {
    users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  } catch {
    console.error(`${usersFile}을(를) 읽을 수 없습니다.`);
    process.exit(1);
  }

  const index = users.findIndex((user) => user.email === normalizedEmail);
  if (index === -1) {
    console.error(`등록되지 않은 이메일입니다: ${normalizedEmail}`);
    process.exit(1);
  }

  users[index] = { ...users[index], passwordHash };
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");

  console.log(`[fs] 비밀번호가 재설정되었습니다: ${normalizedEmail} (role: ${users[index].role ?? "user"})`);
}

async function main() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    console.error("사용법: node scripts/reset-user-password.cjs <email> <newPassword>");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = hashPassword(newPassword);

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await resetPasswordViaSupabase(normalizedEmail, passwordHash);
  } else {
    resetPasswordViaFs(normalizedEmail, passwordHash);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
