import fs from "fs";
import os from "os";
import path from "path";

/**
 * Resolves the monorepo root (the directory containing the workspace root `package.json`
 * with a `workspaces` field) by walking up from `process.cwd()`. This app (`apps/cnbiz-web`)
 * is always two levels below that root, but this walks up rather than hardcoding `"../.."` so
 * it also resolves correctly if `cwd` is ever the repo root itself (e.g. a script invoked from
 * there). Falls back to `process.cwd()` if no workspace root is found (keeps callers non-fatal;
 * they already handle a missing target file, e.g. `packages/cli/dist/index.js` not existing).
 */
export function resolveRepoRoot(startDir: string = process.cwd()): string {
  let dir = path.resolve(startDir);

  while (true) {
    const packageJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const pkg: unknown = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (pkg && typeof pkg === "object" && "workspaces" in pkg) {
          return dir;
        }
      } catch {
        // ignore malformed package.json and keep walking up
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) {
      return startDir;
    }
    dir = parent;
  }
}

/**
 * Resolves packages/cli's compiled entry point. Two other approaches were tried and both failed
 * in production (Vercel), confirmed via function logs on 2026-08-05:
 *
 * 1. path.join(resolveRepoRoot(), "packages", "cli", "dist", "index.js") — resolveRepoRoot()'s
 *    package.json walk-up never finds a workspace root inside the Lambda bundle and silently
 *    falls back to process.cwd(), which is apps/cnbiz-web's own directory — one level short
 *    (missing the "up two more directories" step), so this always pointed at a nonexistent path.
 * 2. require.resolve("@ai-business-os/cli") — Turbopack's build-time analysis of that literal
 *    string rewrote it into an internal bundler module id instead of leaving it as a real
 *    filesystem path; at runtime the code tried to `node` that numeric id as if it were a file
 *    ("Cannot find module '/var/task/apps/cnbiz-web/37795'").
 *
 * apps/cnbiz-web is always exactly two directories below the monorepo root — both locally and
 * inside the deployed bundle, since outputFileTracingRoot (next.config.ts) mirrors that same
 * structure — and process.cwd() reliably equals apps/cnbiz-web's own directory at runtime (this
 * is what approach 1's fallback value demonstrated). No dynamic discovery needed.
 */
export function resolveCliEntry(): string | null {
  const candidate = path.join(process.cwd(), "..", "..", "packages", "cli", "dist", "index.js");
  return fs.existsSync(candidate) ? candidate : null;
}

const CLI_SCRATCH_ROOT = path.join(os.tmpdir(), "ai-business-os-cli");

/**
 * Vercel's deployed function filesystem is read-only outside /tmp. An earlier version branched
 * on process.env.VERCEL to keep writing into <repoRoot>/.generated-websites for local dev
 * convenience, but that branch turned out to be unreliable at runtime — the mkdir still landed
 * inside the read-only deployment bundle instead of /tmp even with the check in place (confirmed
 * via production logs, 2026-08-05: "ENOENT ... mkdir '/var/task/apps/cnbiz-web/agents'").
 * Always using os.tmpdir() (unconditionally, on every platform) removes that ambiguity entirely.
 */
export function resolveGeneratedWebsitesDir(subPath: string): string {
  return path.join(CLI_SCRATCH_ROOT, "generated-websites", subPath);
}

/**
 * Working directory for the `node <cliEntry> website create ...` subprocess. packages/cli's
 * generation workflow has a known side effect of scaffolding some files (e.g. an `agents/`
 * directory) relative to its own cwd regardless of `--out`, so this needs to be writable too —
 * same unconditional os.tmpdir() reasoning as resolveGeneratedWebsitesDir() above. The directory
 * is created eagerly because child_process.spawn() requires `cwd` to already exist.
 */
export function resolveCliWorkingDir(): string {
  const dir = path.join(CLI_SCRATCH_ROOT, "cli-cwd");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
