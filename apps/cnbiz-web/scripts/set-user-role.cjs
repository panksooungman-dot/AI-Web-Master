#!/usr/bin/env node
/**
 * Standalone script to change an existing login account's RBAC role
 * (release hardening, v1.0). Same standalone-CommonJS precedent as
 * scripts/create-auth-user.cjs (see that file's header comment, including its
 * Supabase-vs-fs storage note).
 *
 * Usage: node scripts/set-user-role.cjs <email> <role>
 * role: user | admin | developer | super_admin
 */
/* eslint-disable @typescript-eslint/no-require-imports -- standalone CommonJS script, see screenshot.cjs for the same precedent */
const fs = require("fs");
const path = require("path");

const VALID_ROLES = ["user", "admin", "developer", "super_admin"];

async function setRoleViaSupabase(normalizedEmail, role) {
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

  const previousRole = row.data.role ?? "user";
  const updated = { ...row.data, role };

  const { error: updateError } = await client
    .from("app_collections")
    .update({ data: updated })
    .eq("collection", "users")
    .eq("id", row.id);
  if (updateError) throw new Error(`Supabase update 실패: ${updateError.message}`);

  console.log(`[Supabase] 역할이 변경되었습니다: ${normalizedEmail} (${previousRole} → ${role})`);
}

function setRoleViaFs(normalizedEmail, role) {
  const usersFile = path.join(process.cwd(), "lib", "data", "users.json");

  if (!fs.existsSync(usersFile)) {
    console.error("사용자 저장소(lib/data/users.json)가 없습니다. 먼저 계정을 생성하세요.");
    process.exit(1);
  }

  let users;
  try {
    users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  } catch {
    console.error("lib/data/users.json을 읽을 수 없습니다.");
    process.exit(1);
  }

  const index = users.findIndex((user) => user.email === normalizedEmail);
  if (index === -1) {
    console.error(`등록되지 않은 이메일입니다: ${normalizedEmail}`);
    process.exit(1);
  }

  const previousRole = users[index].role ?? "user";
  users[index] = { ...users[index], role };
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), "utf-8");

  console.log(`[fs] 역할이 변경되었습니다: ${normalizedEmail} (${previousRole} → ${role})`);
}

async function main() {
  const [, , email, role] = process.argv;

  if (!email || !role) {
    console.error("사용법: node scripts/set-user-role.cjs <email> <role>");
    console.error(`role: ${VALID_ROLES.join(" | ")}`);
    process.exit(1);
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`올바르지 않은 role입니다: ${role} (허용값: ${VALID_ROLES.join(", ")})`);
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await setRoleViaSupabase(normalizedEmail, role);
  } else {
    setRoleViaFs(normalizedEmail, role);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
