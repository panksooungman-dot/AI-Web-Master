import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";

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
 * Resolves packages/cli's compiled entry point via Node's own module resolution instead of
 * path.join(resolveRepoRoot(), "packages", "cli", "dist", "index.js"). In a Vercel serverless
 * runtime, process.cwd() doesn't walk up to a package.json with a `workspaces` field the way it
 * does in local dev (the bundle's directory layout doesn't mirror the source repo), so the old
 * path-join approach never found the file in production even after it was correctly included in
 * the deployment (confirmed via Vercel function logs, 2026-08-05 — "packages/cli가 아직
 * 빌드되지 않았습니다." even though the trace output demonstrably contained it). require.resolve()
 * on the package name works regardless of directory layout because apps/cnbiz-web now declares a
 * real dependency on @ai-business-os/cli (package.json), so Node's standard module resolution
 * (which Next.js's file tracing already understands and bundles correctly) finds it.
 */
export function resolveCliEntry(): string | null {
  try {
    const require = createRequire(import.meta.url);
    return require.resolve("@ai-business-os/cli");
  } catch {
    return null;
  }
}

/**
 * Vercel's deployed function filesystem is read-only outside /tmp — writing generated website
 * files under resolveRepoRoot()/.generated-websites (as this always did in local dev, where it's
 * convenient to inspect output in the repo) fails there. Route to a genuinely writable directory
 * in production while keeping the existing repo-relative location for local dev.
 */
export function resolveGeneratedWebsitesDir(subPath: string): string {
  const base = process.env.VERCEL
    ? path.join(os.tmpdir(), "ai-business-os-generated-websites")
    : path.join(resolveRepoRoot(), ".generated-websites");

  return path.join(base, subPath);
}
