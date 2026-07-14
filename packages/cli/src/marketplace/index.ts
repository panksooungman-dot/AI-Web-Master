import fs from "fs-extra";
import path from "path";
import { LocalMarketplaceProvider } from "./providers/local.js";
import { readManifest } from "./manifest.js";
import { PACKAGE_TYPES, TYPE_DIR_NAMES, type PackageType } from "./types.js";
import type { MarketplaceProvider } from "./providers/types.js";

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

export interface InstalledPackageInfo {
  type: PackageType;
  name: string;
  installedVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  description: string;
  author: string;
  dir: string;
}

/** Compares "x.y.z" strings numerically. Positive if `a` > `b`. */
function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < 3; i += 1) {
    if (partsA[i] !== partsB[i]) return partsA[i] - partsB[i];
  }

  return 0;
}

/**
 * cwd에 실제로 설치된 패키지 목록 — `discoverLocalPackages()`(agents/·workflows/·skills/
 * 스캔)로 찾은 각 패키지의 자체 manifest.json(= 설치 당시 버전)을, 같은 이름/타입의
 * 마켓플레이스 게시본(provider.list())과 비교해 업데이트 가능 여부를 계산한다.
 * 설치 버전을 별도로 추적하는 상태 파일이 없다 — 설치된 패키지 폴더 자체가
 * manifest.json을 포함하고 있어(install()이 통째로 복사) 그 자체가 기록이다.
 */
export async function getInstalledPackages(
  provider: MarketplaceProvider = getMarketplaceProvider(),
  cwd: string = process.cwd()
): Promise<InstalledPackageInfo[]> {
  const [discovered, published] = await Promise.all([discoverLocalPackages(cwd), provider.list()]);

  const results: InstalledPackageInfo[] = [];

  for (const pkg of discovered) {
    let manifest;
    try {
      manifest = await readManifest(pkg.dir);
    } catch {
      continue;
    }

    const latest = published.find((entry) => entry.type === pkg.type && entry.name === pkg.name);

    results.push({
      type: pkg.type,
      name: pkg.name,
      installedVersion: manifest.version,
      latestVersion: latest?.version ?? null,
      updateAvailable: latest ? compareVersions(latest.version, manifest.version) > 0 : false,
      description: manifest.description,
      author: manifest.author,
      dir: pkg.dir
    });
  }

  return results;
}
