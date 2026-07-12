export type PackageType = "agent" | "workflow" | "skill";

export const PACKAGE_TYPES: PackageType[] = ["agent", "workflow", "skill"];

/** 패키지 타입 → 로컬/마켓플레이스 디렉터리 이름 (agents/workflows/skills, `ai create`와 동일) */
export const TYPE_DIR_NAMES: Record<PackageType, string> = {
  agent: "agents",
  workflow: "workflows",
  skill: "skills"
};

export function isPackageType(value: string): value is PackageType {
  return (PACKAGE_TYPES as string[]).includes(value);
}

/** 모든 패키지(agent/workflow/skill)가 공통으로 가져야 하는 메타데이터 */
export interface PackageManifest {
  name: string;
  type: PackageType;
  version: string;
  description: string;
  author: string;
  createdAt: string;
}

/** 마켓플레이스 index.json에 저장되는 항목 (manifest + 게시 시각) */
export interface MarketplaceEntry extends PackageManifest {
  publishedAt: string;
}

export type MarketplaceErrorCode =
  | "NOT_FOUND"
  | "INVALID_MANIFEST"
  | "ALREADY_PUBLISHED"
  | "DUPLICATE_PACKAGE";

export class MarketplaceError extends Error {
  code: MarketplaceErrorCode;

  constructor(code: MarketplaceErrorCode, message: string) {
    super(message);
    this.name = "MarketplaceError";
    this.code = code;
  }
}
