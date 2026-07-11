import fs from "fs-extra";
import path from "path";

/**
 * Find the AI Business OS project root.
 * The project root must contain BOTH:
 *  - .git
 *  - packages directory
 */
export async function findProjectRoot(
  start = process.cwd()
): Promise<string> {
  let current = start;

  while (true) {
    const hasGit = await fs.pathExists(path.join(current, ".git"));
    const hasPackages = await fs.pathExists(path.join(current, "packages"));

    if (hasGit && hasPackages) {
      return current;
    }

    const parent = path.dirname(current);

    if (parent === current) {
      throw new Error("AI Business OS project root not found.");
    }

    current = parent;
  }
}