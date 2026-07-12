import fs from "fs-extra";
import path from "path";
import { MarketplaceError, TYPE_DIR_NAMES, type MarketplaceEntry, type PackageManifest, type PackageType } from "../types.js";
import type { ListFilter, MarketplaceProvider } from "./types.js";

/**
 * `marketplace/index.json` + `marketplace/<type>s/<name>/` 폴더 기반의
 * 로컬 파일시스템 마켓플레이스 구현.
 */
export class LocalMarketplaceProvider implements MarketplaceProvider {
  private readonly root: string;
  private readonly indexFile: string;

  constructor(root: string) {
    this.root = root;
    this.indexFile = path.join(root, "index.json");
  }

  packageDir(type: PackageType, name: string): string {
    return path.join(this.root, TYPE_DIR_NAMES[type], name);
  }

  private async readIndex(): Promise<MarketplaceEntry[]> {
    if (!(await fs.pathExists(this.indexFile))) {
      return [];
    }

    const data = await fs.readJson(this.indexFile);
    return Array.isArray(data) ? (data as MarketplaceEntry[]) : [];
  }

  private async writeIndex(entries: MarketplaceEntry[]): Promise<void> {
    await fs.ensureDir(this.root);
    await fs.writeJson(this.indexFile, entries, { spaces: 2 });
  }

  async list(filter: ListFilter = {}): Promise<MarketplaceEntry[]> {
    const entries = await this.readIndex();

    return entries.filter((entry) => {
      if (filter.type && entry.type !== filter.type) {
        return false;
      }

      if (filter.keyword) {
        const haystack = `${entry.name} ${entry.description}`.toLowerCase();
        if (!haystack.includes(filter.keyword.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  async publish(sourceDir: string, manifest: PackageManifest): Promise<MarketplaceEntry> {
    const entries = await this.readIndex();
    const existingIndex = entries.findIndex(
      (entry) => entry.type === manifest.type && entry.name === manifest.name
    );

    if (existingIndex !== -1 && entries[existingIndex].version === manifest.version) {
      throw new MarketplaceError(
        "ALREADY_PUBLISHED",
        `Package "${manifest.name}" (${manifest.type}) v${manifest.version} is already published. Bump the version to publish an update.`
      );
    }

    const targetDir = this.packageDir(manifest.type, manifest.name);
    await fs.remove(targetDir);
    await fs.copy(sourceDir, targetDir);

    const publishedEntry: MarketplaceEntry = {
      ...manifest,
      publishedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      entries[existingIndex] = publishedEntry;
    } else {
      entries.push(publishedEntry);
    }

    await this.writeIndex(entries);
    return publishedEntry;
  }

  async install(type: PackageType, name: string, targetDir: string): Promise<void> {
    const sourceDir = this.packageDir(type, name);

    if (!(await fs.pathExists(sourceDir))) {
      throw new MarketplaceError("NOT_FOUND", `Package "${name}" (${type}) not found in the marketplace.`);
    }

    if (await fs.pathExists(targetDir)) {
      throw new MarketplaceError(
        "DUPLICATE_PACKAGE",
        `"${name}" (${type}) is already installed at ${targetDir}.`
      );
    }

    await fs.copy(sourceDir, targetDir);
  }
}
