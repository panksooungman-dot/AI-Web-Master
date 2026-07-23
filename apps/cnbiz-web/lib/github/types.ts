/**
 * AI Business OS Rewiring Phase 3 — 고객별 독립 GitHub Repository 자동 생성.
 * GitHub REST API 응답을 그대로 노출하지 않고, 이 파이프라인이 실제로 쓰는 필드만 좁혀서 다룬다.
 */

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CreateRepositoryInput {
  name: string;
  description?: string;
  /** 기본값 true — 고객 프로젝트는 기본적으로 비공개 저장소로 생성한다. */
  private?: boolean;
}

export interface GitHubRepository {
  id: number;
  /** 저장소 이름만(예: "acme-restaurant-a1b2c3d4"). */
  name: string;
  /** "owner/name" 형태. */
  fullName: string;
  owner: string;
  htmlUrl: string;
  cloneUrl: string;
  defaultBranch: string;
}

export interface GitHubOperationResult {
  success: boolean;
  error?: string;
}
