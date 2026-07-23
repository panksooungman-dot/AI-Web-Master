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
  gitBranch?: string;
}

/** Production Deploy 실행 — 연결된 Git 저장소의 지정 브랜치를 기준으로 배포를 생성한다. */
export async function createDeployment(
  input: CreateDeploymentInput,
  fetchFn: FetchLike = fetch
): Promise<VercelDeployment> {
  if (!isVercelConfigured()) {
    throw new VercelApiError("VERCEL_TOKEN이 설정되지 않았습니다.");
  }

  const res = await fetchFn(`${VERCEL_API_BASE}/v13/deployments${teamQuery()}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: input.name,
      project: input.projectId,
      target: "production",
      gitSource: { type: "github", ref: input.gitBranch ?? "main" },
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
