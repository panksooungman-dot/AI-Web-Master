import fs from "fs-extra";
import path from "path";

export class FileSystem {
  /**
   * Check if a file or directory exists.
   */
  static async exists(target: string): Promise<boolean> {
    return fs.pathExists(target);
  }

  /**
   * Create a directory if it does not exist.
   */
  static async ensureDirectory(directory: string): Promise<void> {
    await fs.ensureDir(directory);
  }

  /**
   * Copy files or directories.
   */
  static async copy(source: string, destination: string): Promise<void> {
    await fs.copy(source, destination, {
      overwrite: true
    });
  }

  /**
   * Remove a file or directory.
   */
  static async remove(target: string): Promise<void> {
    if (await fs.pathExists(target)) {
      await fs.remove(target);
    }
  }

  /**
   * Read a JSON file.
   */
  static async readJson<T>(file: string): Promise<T> {
    return fs.readJson(file);
  }

  /**
   * Write a JSON file.
   */
  static async writeJson(
    file: string,
    data: unknown
  ): Promise<void> {
    await fs.writeJson(file, data, {
      spaces: 2
    });
  }

  /**
   * Read a text file.
   */
  static async readText(file: string): Promise<string> {
    return fs.readFile(file, "utf8");
  }

  /**
   * Write a text file.
   */
  static async writeText(
    file: string,
    content: string
  ): Promise<void> {
    await fs.writeFile(file, content, "utf8");
  }

  /**
   * List directory contents.
   */
  static async list(directory: string): Promise<string[]> {
    if (!(await fs.pathExists(directory))) {
      return [];
    }

    return fs.readdir(directory);
  }

  /**
   * Get the current working directory.
   */
  static cwd(): string {
    return process.cwd();
  }

  /**
   * Join path segments.
   */
  static join(...segments: string[]): string {
    return path.join(...segments);
  }

  /**
   * Resolve an absolute path.
   */
  static resolve(...segments: string[]): string {
    return path.resolve(...segments);
  }
}