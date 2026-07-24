import type { FetchLike, VercelDeployment, VercelOperationResult, VercelProject } from "./types";

/**
 * AI Business OS Rewiring Phase 3 — Vercel REST API 클라이언트. 이 저장소가 이미 CLI(`npx vercel`)
 * 로 자기 자신(apps/cnbiz-web)을 배포하는 것과는 완전히 별개다 — 이 모듈은 "고객별 신규 Vercel
 * Project"를 코드로 생성·연결·배포하기 위한 것이라 REST API(`api.vercel.com`)를 직접 호출한다.
 * lib/github/client.ts와 동일한 원칙: 새 SDK 의존성 없이 `fetch`만 사용, 토큰은
 * process.env.VERCEL_TOKEN, `fetchFn` 주입 가능.
 *
 * ⚠️ 엔드포인트 버전(v9/v10/v13)은 Vercel 공개 문서 기준으로 작성했으며, 이 환경에는
 * `VERCEL_TOKEN`이 없어 실제 계정으로 왕복 검증하지 못했다(PHASE3_REPORT.md에 명시). 토큰이
 * 없으면 모든 함수가 즉시 실패를 반환하고 실제 API를 호출하지 않는다.
 */

const VERCEL_API_BASE = "https://api.vercel.com";

export class VercelApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "VercelApiError";
    this.status = status;
  }
}

export function isVercelConfigured(): boolean {
  return Boolean(process.env.VERCEL_TOKEN);
}

/** 팀(Team) 스코프 토큰이면 모든 요청에 teamId 쿼리를 붙여야 한다(Vercel REST API 공통 규칙). */
function teamQuery(): string {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

export async function createProject(name: string, fetchFn: FetchLike = fetch): Promise<VercelProject> {
  if (!isVercelConfigured()) {
    throw new VercelApiError("VERCEL_TOKEN이 설정되지 않았습니다.");
  }

  const res = await fetchFn(`${VERCEL_API_BASE}/v10/projects${teamQuery()}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    throw new VercelApiError(`Vercel project 생성 실패 (${res.status}): ${await readErrorBody(res)}`, res.status);
  }

  const json = (await res.json()) as Record<string, unknown>;
  return { id: String(json.id ?? ""), name: String(json.name ?? name) };
}

/** 생성된 Project에 GitHub 저장소를 연결한다(Workflow의 6단계 — Project 생성과 분리된 별도 호출). */
export async function linkGitRepository(
  projectIdOrName: string,
  repoFullName: string,
  fetchFn: FetchLike = fetch
): Promise<VercelOperationResult> {
  if (!isVercelConfigured()) {
    return { success: false, error: "VERCEL_TOKEN이 설정되지 않았습니다." };
  }

  const res = await fetchFn(
    `${VERCEL_API_BASE}/v9/projects/${encodeURIComponent(projectIdOrName)}/link${teamQuery()}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ type: "github", repo: repoFullName }),
    }
  );

  if (res.ok) return { success: true };
  return { success: false, error: `Vercel-GitHub 연결 실패 (${res.status}): ${await readErrorBody(res)}` };
}

export interface CreateDeploymentInput {
  name: string;
  projectId: string;
  /**
   * GitHub Repository의 숫자 ID(`GitHubRepository.id`, `lib/github/client.ts`의
   * `createRepository()`가 이미 응답으로 받아 갖고 있는 값) — Vercel API가 `gitSource.type:
   * "github"`로 배포를 생성할 때 필수로 요구한다. 저장소 이름(`repoFullName`)만으로는 부족하다
   * (실제로 이 필드 없이 호출해 `400 gitSource missing required property repoId`를 받은 적이
   * 있다 — FINAL_E2E_REPORT.md 참고).
   */
  repoId: number;
  gitBranch?: string;
  /**
   * true면 "이 Project의 첫 배포"임을 명시한다 — Vercel 공식 스펙(POST /v13/deployments)상
   * `projectSettings`는 "Project의 첫 배포에만 필수이고 이후 배포에는 저장된 값이 재사용된다."
   * 매번 `projectSettings`를 직접 구성해 보내는 대신(프레임워크를 하드코딩해야 하는 부담·값이
   * 어긋나면 실제 설정을 덮어써버릴 위험), 공식 문서가 명시적으로 제시하는 대안인 쿼리 파라미터
   * `skipAutoDetectionConfirmation=1`을 이 값이 true일 때만 추가한다 — "Vercel이 자동으로 감지한
   * 프레임워크를 그대로 신뢰하겠다"는 명시적 동의로, 새 Project 특유의 `400
   * missing_project_settings`(FINAL_E2E_REPORT_v2.md 참고)를 피한다.
   *
   * 기본값 false(미지정) — **기존 Project를 재배포하는 호출에는 아무 영향도 주지 않는다.** 이
   * 파이프라인(`lib/deployment/pipeline.ts`)은 매번 `createProject()` 직후에만
   * `createDeployment()`를 호출하므로 항상 `true`를 전달한다.
   */
  isInitialDeployment?: boolean;
}

/** `createDeployment()`가 실제로 fetch를 호출하기 전에 요청 Body를 이룰 값들을 검증한다. */
function assertValidDeploymentInput(input: CreateDeploymentInput): void {
  if (!input.name || typeof input.name !== "string") {
    throw new VercelApiError("Deployment 요청 검증 실패: name이 비어 있거나 문자열이 아닙니다.");
  }
  if (!input.projectId || typeof input.projectId !== "string") {
    throw new VercelApiError("Deployment 요청 검증 실패: projectId가 비어 있거나 문자열이 아닙니다.");
  }
  if (!Number.isInteger(input.repoId) || input.repoId <= 0) {
    throw new VercelApiError(
      `Deployment 요청 검증 실패: repoId가 유효하지 않습니다(받은 값: ${JSON.stringify(input.repoId)}). ` +
        `Vercel gitSource.repoId는 GitHub Repository 생성 시 받은 양의 정수 ID여야 합니다.`
    );
  }
}

/** Production Deploy 실행 — 연결된 Git 저장소의 지정 브랜치를 기준으로 배포를 생성한다. */
export async function createDeployment(
  input: CreateDeploymentInput,
  fetchFn: FetchLike = fetch
): Promise<VercelDeployment> {
  if (!isVercelConfigured()) {
    throw new VercelApiError("VERCEL_TOKEN이 설정되지 않았습니다.");
  }

  assertValidDeploymentInput(input);

  const query = new URLSearchParams();
  const teamId = process.env.VERCEL_TEAM_ID;
  if (teamId) query.set("teamId", teamId);
  // isInitialDeployment가 true일 때만 추가 — 재배포 호출(기존 Project)에는 절대 붙이지 않는다.
  if (input.isInitialDeployment) query.set("skipAutoDetectionConfirmation", "1");
  const queryString = query.toString();

  const res = await fetchFn(`${VERCEL_API_BASE}/v13/deployments${queryString ? `?${queryString}` : ""}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: input.name,
      project: input.projectId,
      target: "production",
      // Vercel API 공식 스펙(gitSource discriminated union, type: "github") — repoId가 없으면
      // "gitSource missing required property repoId"로 거부된다. ref는 선택 필드(브랜치 지정).
      gitSource: { type: "github", repoId: input.repoId, ref: input.gitBranch ?? "main" },
    }),
  });

  if (!res.ok) {
    throw new VercelApiError(`Vercel 배포 실패 (${res.status}): ${await readErrorBody(res)}`, res.status);
  }

  const json = (await res.json()) as Record<string, unknown>;
  const host = typeof json.url === "string" ? json.url : "";

  return {
    id: String(json.id ?? json.uid ?? ""),
    url: host ? `https://${host}` : "",
    readyState: typeof json.readyState === "string" ? json.readyState : "UNKNOWN",
  };
}

/** 롤백용. 이미 없는 Project(404)는 실패로 취급하지 않는다(lib/github/client.ts와 동일 원칙). */
export async function deleteProject(idOrName: string, fetchFn: FetchLike = fetch): Promise<VercelOperationResult> {
  if (!isVercelConfigured()) {
    return { success: false, error: "VERCEL_TOKEN이 설정되지 않았습니다." };
  }

  try {
    const res = await fetchFn(`${VERCEL_API_BASE}/v9/projects/${encodeURIComponent(idOrName)}${teamQuery()}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (res.ok || res.status === 404) return { success: true };
    return { success: false, error: `Vercel project 삭제 실패 (${res.status}): ${await readErrorBody(res)}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}
