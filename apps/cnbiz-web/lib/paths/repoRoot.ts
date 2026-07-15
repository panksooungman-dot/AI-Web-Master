import fs from "fs";
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
