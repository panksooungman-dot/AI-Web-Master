import type {
  CreateRepositoryInput,
  FetchLike,
  GitHubOperationResult,
  GitHubRepository,
} from "./types";

/**
 * AI Business OS Rewiring Phase 3 — GitHub REST API 클라이언트. 새 npm 의존성(Octokit 등) 없이
 * `fetch`만 사용한다(lib/design/figma-generator.ts의 `importFigmaFile()`/`exportFigmaFile()`와
 * 동일한 관례 — 토큰은 process.env에서 읽고, `fetchFn`을 주입 가능한 매개변수로 두어 테스트에서
 * 실제 네트워크 호출 없이 검증 가능하게 한다).
 *
 * `GITHUB_TOKEN`은 이 저장소 어디에도 아직 설정되어 있지 않다(PHASE3_REPORT.md 참고) — 토큰이
 * 없으면 모든 함수가 즉시 실패를 반환하고 실제 API를 호출하지 않는다(Figma의 "미설정 시 결정론적
 * 폴백"과 달리, 저장소/배포 URL은 실재하는 리소스를 가리키므로 가짜 값을 지어내지 않는다 —
 * 아래 lib/deployment/pipeline.ts의 정책 참고).
 */

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export function isGitHubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * `GITHUB_OWNER`가 설정되어 있으면 그 조직(org) 아래에, 아니면 토큰 소유자의 개인 계정에
 * 생성한다(`POST /user/repos`). `auto_init: false` — 로컬에서 만든 산출물을 그대로 첫 커밋으로
 * 올릴 것이므로 GitHub이 README로 초기 커밋을 만들게 하지 않는다.
 */
export async function createRepository(
  input: CreateRepositoryInput,
  fetchFn: FetchLike = fetch
): Promise<GitHubRepository> {
  if (!isGitHubConfigured()) {
    throw new GitHubApiError("GITHUB_TOKEN이 설정되지 않았습니다.");
  }

  const owner = process.env.GITHUB_OWNER;
  const endpoint = owner ? `${GITHUB_API_BASE}/orgs/${owner}/repos` : `${GITHUB_API_BASE}/user/repos`;

  const res = await fetchFn(endpoint, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description,
      private: input.private ?? true,
      auto_init: false,
    }),
  });

  if (!res.ok) {
    throw new GitHubApiError(`GitHub repo 생성 실패 (${res.status}): ${await readErrorBody(res)}`, res.status);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const fullName = String(json.full_name ?? "");
  const [ownerPart] = fullName.split("/");

  return {
    id: Number(json.id),
    name: String(json.name ?? input.name),
    fullName,
    owner: ownerPart ?? owner ?? "",
    htmlUrl: String(json.html_url ?? ""),
    cloneUrl: String(json.clone_url ?? ""),
    defaultBranch: typeof json.default_branch === "string" && json.default_branch ? json.default_branch : "main",
  };
}

/**
 * 롤백용. 이미 삭제되어 없는 저장소(404)는 실패로 취급하지 않는다 —
 * lib/commandEngine/engine.ts의 `terminateProcessTree()`가 "이미 종료된 PID"를 성공으로 보는
 * 것과 동일한 멱등성 원칙.
 */
export async function deleteRepository(fullName: string, fetchFn: FetchLike = fetch): Promise<GitHubOperationResult> {
  if (!isGitHubConfigured()) {
    return { success: false, error: "GITHUB_TOKEN이 설정되지 않았습니다." };
  }

  try {
    const res = await fetchFn(`${GITHUB_API_BASE}/repos/${fullName}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (res.ok || res.status === 404) return { success: true };

    return { success: false, error: `GitHub repo 삭제 실패 (${res.status}): ${await readErrorBody(res)}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}
