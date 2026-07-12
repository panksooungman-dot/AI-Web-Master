import fs from "fs-extra";
import path from "path";
import { LocalMarketplaceProvider } from "./providers/local.js";
import { PACKAGE_TYPES, TYPE_DIR_NAMES, type PackageType } from "./types.js";

export * from "./types.js";
export * from "./manifest.js";
export type { ListFilter, MarketplaceProvider } from "./providers/types.js";

export function getMarketplaceRoot(cwd: string = process.cwd()): string {
  return path.join(cwd, "marketplace");
}

/**
 * 현재는 로컬 파일시스템 Provider만 존재한다. 향후 온라인 레지스트리를
 * 추가할 때는 이 함수가 설정/환경변수에 따라 다른 MarketplaceProvider 구현체를
 * 반환하도록 확장하면 되고, publish/search/install 커맨드는 수정할 필요가 없다.
 */
export function getMarketplaceProvider(cwd: string = process.cwd()): LocalMarketplaceProvider {
  return new LocalMarketplaceProvider(getMarketplaceRoot(cwd));
}

export interface DiscoveredPackage {
  type: PackageType;
  name: string;
  dir: string;
}

/**
 * cwd의 `agents/`·`workflows/`·`skills/` 폴더(= `ai create`의 결과물)에서
 * manifest.json을 가진 로컬 패키지를 찾는다.
 */
export async function discoverLocalPackages(cwd: string = process.cwd()): Promise<DiscoveredPackage[]> {
  const found: DiscoveredPackage[] = [];

  for (const type of PACKAGE_TYPES) {
    const typeDir = path.join(cwd, TYPE_DIR_NAMES[type]);

    if (!(await fs.pathExists(typeDir))) {
      continue;
    }

    const entries = await fs.readdir(typeDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageDir = path.join(typeDir, entry.name);

      if (await fs.pathExists(path.join(packageDir, "manifest.json"))) {
        found.push({ type, name: entry.name, dir: packageDir });
      }
    }
  }

  return found;
}
