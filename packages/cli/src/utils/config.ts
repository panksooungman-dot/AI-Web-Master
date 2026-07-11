import fs from "fs-extra";
import path from "path";

export interface AIBusinessOSConfig {
  name: string;
  version: string;
  marketplace?: string;
  registry?: string;
  createdAt?: string;
}

const CONFIG_FILE = "ai-business-os.json";

export class Config {
  /**
   * Returns the absolute path to the config file.
   */
  static getConfigPath(): string {
    return path.join(process.cwd(), CONFIG_FILE);
  }

  /**
   * Checks whether the config file exists.
   */
  static async exists(): Promise<boolean> {
    return fs.pathExists(this.getConfigPath());
  }

  /**
   * Reads the configuration file.
   */
  static async load(): Promise<AIBusinessOSConfig | null> {
    const configPath = this.getConfigPath();

    if (!(await fs.pathExists(configPath))) {
      return null;
    }

    return fs.readJson(configPath);
  }

  /**
   * Saves the configuration file.
   */
  static async save(config: AIBusinessOSConfig): Promise<void> {
    await fs.writeJson(this.getConfigPath(), config, {
      spaces: 2
    });
  }

  /**
   * Updates existing configuration.
   */
  static async update(
    updates: Partial<AIBusinessOSConfig>
  ): Promise<AIBusinessOSConfig> {
    const current =
      (await this.load()) ?? {
        name: "ai-business-os",
        version: "1.1.0"
      };

    const merged = {
      ...current,
      ...updates
    };

    await this.save(merged);

    return merged;
  }

  /**
   * Deletes the configuration file.
   */
  static async remove(): Promise<void> {
    const configPath = this.getConfigPath();

    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
  }
}