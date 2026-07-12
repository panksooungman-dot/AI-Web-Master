import fs from "fs-extra";
import path from "path";
import { ToolError, type Tool } from "./types.js";

export interface FilesystemInput {
  action: "read" | "write" | "list" | "exists";
  path: string;
  content?: string;
  cwd?: string;
}

/** cwd 바깥으로 벗어나는 경로(`..` 탈출 등)를 막는다. */
function resolveScopedPath(cwd: string, targetPath: string): string {
  const root = path.resolve(cwd);
  const resolved = path.resolve(root, targetPath);

  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new ToolError("FORBIDDEN_PATH", "filesystem", `Path "${targetPath}" resolves outside of ${root}.`);
  }

  return resolved;
}

function isFilesystemInput(input: unknown): input is FilesystemInput {
  return (
    typeof input === "object" &&
    input !== null &&
    typeof (input as Record<string, unknown>).action === "string" &&
    typeof (input as Record<string, unknown>).path === "string"
  );
}

export const filesystemTool: Tool = {
  id: "filesystem",
  name: "Filesystem",
  description: "Read/write/list files scoped to the current project (read/write/list/exists).",

  async execute(input: unknown): Promise<unknown> {
    if (!isFilesystemInput(input)) {
      throw new ToolError(
        "INVALID_INPUT",
        "filesystem",
        'Expected { action: "read"|"write"|"list"|"exists", path: string, content?: string }'
      );
    }

    const cwd = input.cwd ?? process.cwd();
    const target = resolveScopedPath(cwd, input.path);

    try {
      switch (input.action) {
        case "exists":
          return { exists: await fs.pathExists(target) };

        case "read":
          return { content: await fs.readFile(target, "utf8") };

        case "write":
          await fs.ensureDir(path.dirname(target));
          await fs.writeFile(target, input.content ?? "", "utf8");
          return { written: true, path: target };

        case "list": {
          const entries = await fs.readdir(target, { withFileTypes: true });
          return {
            entries: entries.map((entry) => ({
              name: entry.name,
              type: entry.isDirectory() ? "directory" : "file"
            }))
          };
        }

        default:
          throw new ToolError("INVALID_INPUT", "filesystem", `Unknown action "${String(input.action)}"`);
      }
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError(
        "EXECUTION_FAILED",
        "filesystem",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
};
