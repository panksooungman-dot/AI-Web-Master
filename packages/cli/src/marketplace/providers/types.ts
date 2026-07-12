import type { MarketplaceEntry, PackageManifest, PackageType } from "../types.js";

export interface ListFilter {
  type?: PackageType;
  keyword?: string;
}

/**
 * 마켓플레이스 백엔드 추상화.
 * 지금은 로컬 파일시스템 구현(LocalMarketplaceProvider)만 존재하지만,
 * 이 인터페이스만 만족하면 향후 온라인 레지스트리(HTTP 기반)로 교체하거나
 * 병행 사용할 수 있다 — 커맨드(publish/search/install)는 이 인터페이스만 알면 된다.
 */
export interface MarketplaceProvider {
  /** 조건(type/keyword)에 맞는 게시된 패키지 목록을 반환한다. */
  list(filter?: ListFilter): Promise<MarketplaceEntry[]>;

  /** 로컬 패키지 디렉터리를 마켓플레이스에 게시(복사 + 인덱스 갱신)한다. */
  publish(sourceDir: string, manifest: PackageManifest): Promise<MarketplaceEntry>;

  /** 마켓플레이스의 패키지를 대상 디렉터리로 설치(복사)한다. */
  install(type: PackageType, name: string, targetDir: string): Promise<void>;
}
