import fs from "fs-extra";
import path from "path";
import { isPackageType, MarketplaceError, type PackageManifest } from "./types.js";

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
/** Safe slug — package name flows directly into path.join(root, typeDir, name) in publish/install/uninstall. */
const NAME_PATTERN = /^[a-z0-9][a-z0-9-_]*$/i;

const REQUIRED_FIELDS: (keyof PackageManifest)[] = [
  "name",
  "type",
  "version",
  "description",
  "author",
  "createdAt"
];

export function manifestPath(packageDir: string): string {
  return path.join(packageDir, "manifest.json");
}

/**
 * 패키지 디렉터리에서 manifest.json을 읽고 검증한다.
 * 필수 필드(name/type/version/description/author/createdAt) 누락, 잘못된 type,
 * semver 형식이 아닌 version은 모두 MarketplaceError(INVALID_MANIFEST)로 처리한다.
 */
export async function readManifest(packageDir: string): Promise<PackageManifest> {
  const file = manifestPath(packageDir);

  if (!(await fs.pathExists(file))) {
    throw new MarketplaceError("NOT_FOUND", `manifest.json not found in ${packageDir}`);
  }

  const raw = await fs.readJson(file);
  return validateManifest(raw, file);
}

export function validateManifest(raw: unknown, sourceHint: string): PackageManifest {
  if (typeof raw !== "object" || raw === null) {
    throw new MarketplaceError("INVALID_MANIFEST", `Invalid manifest in ${sourceHint}: not a JSON object`);
  }

  const manifest = raw as Record<string, unknown>;
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = manifest[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new MarketplaceError(
      "INVALID_MANIFEST",
      `Invalid manifest in ${sourceHint}: missing/empty field(s) ${missing.join(", ")}`
    );
  }

  const name = manifest.name as string;
  if (!NAME_PATTERN.test(name)) {
    throw new MarketplaceError(
      "INVALID_MANIFEST",
      `Invalid manifest in ${sourceHint}: name "${name}" must start with a letter/digit and contain only letters, digits, "-", "_"`
    );
  }

  const type = manifest.type as string;
  if (!isPackageType(type)) {
    throw new MarketplaceError(
      "INVALID_MANIFEST",
      `Invalid manifest in ${sourceHint}: unknown type "${type}" (expected agent, workflow, or skill)`
    );
  }

  const version = manifest.version as string;
  if (!VERSION_PATTERN.test(version)) {
    throw new MarketplaceError(
      "INVALID_MANIFEST",
      `Invalid manifest in ${sourceHint}: version "${version}" must be semver (x.y.z)`
    );
  }

  return {
    name: manifest.name as string,
    type,
    version,
    description: manifest.description as string,
    author: manifest.author as string,
    createdAt: manifest.createdAt as string
  };
}
