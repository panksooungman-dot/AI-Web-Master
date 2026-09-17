import fs from "fs";
import path from "path";
import type { FetchLike, GitStepResult, GitTargetRepo } from "./types";

/**
 * AI Business OS Rewiring Phase 3.1 — GitHub Git Data API 기반 재구현 (2026-09-17).
 *
 * 기존 구현은 로컬 `git` CLI를 `child_process.spawn("git", ...)`으로 직접 실행했다. 이 방식은
 * `npm run dev`로 띄운 로컬 서버(git이 PATH에 있음)에서는 문제없이 동작했지만, 실제
 * 프로덕션(Vercel의 배포된 서버리스 Node.js 함수 런타임)에는 `git` 바이너리 자체가 없어
 * spawn이 즉시 "spawn git ENOENT"로 실패했다(2026-09-17, Website Build → 배포 파이프라인을
 * 처음 실사용한 직후 실제로 재현·보고됨 — GitHub Repository 생성까지는 정상 진행되고 바로
 * 다음 단계에서 처음으로 git을 실행하려는 순간 실패했다). 이는 lib/aiJobs/worker.ts의
 * triggerDeployment()가 호출하는 기존 고객 의뢰 배포 경로도 실제 배포된 함수에서 실행될 때는
 * 동일하게 겪었을 잠재적 결함이다 — 그동안의 검증(PRODUCTION_VALIDATION.md 등)이 전부 로컬
 * dev 서버 기준이라 드러나지 않았을 뿐이다.
 *
 * 이번 재구현은 로컬 git 프로세스를 아예 쓰지 않도록, GitHub REST의 Git Data API
 * (blob → tree → commit → ref)로 완전히 대체한다 — lib/github/client.ts와 동일하게 새 npm
 * 의존성 없이 `fetch`만 사용한다. 부수 효과로, 과거 GIT_SCOPE_FIX_REPORT.md가 다루던 사고
 * (outDir가 상위 모노레포의 .git 안에 중첩되어 `git rev-parse`가 상위 저장소를 가리킴)는
 * 이 구조에서는 원천적으로 발생할 수 없다 — 로컬 git 저장소 개념 자체가 없고, outDir는 그저
 * "이 경로 아래 파일들을 읽어 GitHub에 올릴 소스"일 뿐이라 상위 디렉터리의 git 상태와 전혀
 * 무관하다.
 */

const GITHUB_API_BASE = "https://api.github.com";

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

/**
 * outDir가 실제로 존재하는 디렉터리인지만 확인한다 — 과거 "로컬 git 저장소 초기화" 단계의
 * 자리를 대체한다(더 이상 초기화할 로컬 git 상태 자체가 없다).
 */
export async function ensureRepoInitialized(cwd: string): Promise<GitStepResult> {
  if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
    return { success: false, error: `"${cwd}"가 존재하지 않거나 디렉터리가 아닙니다.` };
  }
  return { success: true };
}

/** 생성물에 보통 없지만, 있다면 커밋 대상에서 제외한다(방어적 스킵). */
const SKIP_DIR_NAMES = new Set([".git", "node_modules"]);

function listFilesRecursive(currentDir: string, out: string[]): void {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue;
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      listFilesRecursive(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
}

interface TreeEntry {
  path: string;
  mode: "100644";
  type: "blob";
  sha: string;
}

/**
 * cwd 아래 모든 파일을 GitHub Git Data API로 blob → tree → commit까지 만든다. 부모 없는
 * root commit이다 — 대상 저장소는 항상 `createRepository({ auto_init: false })`로 방금 만든
 * 빈 저장소이므로(lib/github/client.ts), 이 파이프라인 안에서는 언제나 첫 커밋이다. 성공 시
 * 생성된 commit SHA를 stdout에 담아 pushToRemote()로 그대로 전달한다.
 */
export async function commitAll(
  cwd: string,
  message: string,
  repo: GitTargetRepo,
  token: string,
  fetchFn: FetchLike = fetch
): Promise<GitStepResult> {
  const filePaths: string[] = [];
  try {
    listFilesRecursive(cwd, filePaths);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "파일 목록 조회 실패" };
  }

  if (filePaths.length === 0) {
    return { success: false, error: `"${cwd}"에 커밋할 파일이 없습니다.` };
  }

  const base = `${GITHUB_API_BASE}/repos/${repo.owner}/${repo.name}`;

  let treeEntries: TreeEntry[];
  try {
    treeEntries = await Promise.all(
      filePaths.map(async (filePath): Promise<TreeEntry> => {
        const relativePath = path.relative(cwd, filePath).split(path.sep).join("/");
        const content = fs.readFileSync(filePath).toString("base64");

        const res = await fetchFn(`${base}/git/blobs`, {
          method: "POST",
          headers: { ...authHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({ content, encoding: "base64" }),
        });
        if (!res.ok) {
          throw new Error(`blob 생성 실패 (${relativePath}, ${res.status}): ${await readErrorBody(res)}`);
        }
        const json = (await res.json()) as { sha: string };
        return { path: relativePath, mode: "100644", type: "blob", sha: json.sha };
      })
    );
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "blob 생성 실패" };
  }

  const treeRes = await fetchFn(`${base}/git/trees`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ tree: treeEntries }),
  });
  if (!treeRes.ok) {
    return { success: false, error: `tree 생성 실패 (${treeRes.status}): ${await readErrorBody(treeRes)}` };
  }
  const treeJson = (await treeRes.json()) as { sha: string };

  const now = new Date().toISOString();
  const commitRes = await fetchFn(`${base}/git/commits`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      tree: treeJson.sha,
      parents: [],
      author: { name: "AI Business OS", email: "deploy@cnbiz.kr", date: now },
      committer: { name: "AI Business OS", email: "deploy@cnbiz.kr", date: now },
    }),
  });
  if (!commitRes.ok) {
    return { success: false, error: `commit 생성 실패 (${commitRes.status}): ${await readErrorBody(commitRes)}` };
  }
  const commitJson = (await commitRes.json()) as { sha: string };

  return { success: true, stdout: commitJson.sha };
}

/**
 * commitAll()이 만든 commit SHA로 branch ref를 생성/갱신한다(git push의 대체). 대상 저장소는
 * 방금 생성되어 ref가 아직 없는 것이 일반적인 경로라 먼저 생성을 시도하고, 이미 있으면
 * (재시도 등) 422를 받아 갱신으로 폴백한다.
 */
export async function pushToRemote(
  commitSha: string,
  repo: GitTargetRepo,
  token: string,
  branch = "main",
  fetchFn: FetchLike = fetch
): Promise<GitStepResult> {
  const base = `${GITHUB_API_BASE}/repos/${repo.owner}/${repo.name}`;

  const createRes = await fetchFn(`${base}/git/refs`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitSha }),
  });
  if (createRes.ok) return { success: true };

  if (createRes.status === 422) {
    const updateRes = await fetchFn(`${base}/git/refs/heads/${branch}`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commitSha, force: true }),
    });
    if (updateRes.ok) return { success: true };
    return { success: false, error: `ref 갱신 실패 (${updateRes.status}): ${await readErrorBody(updateRes)}` };
  }

  return { success: false, error: `ref 생성 실패 (${createRes.status}): ${await readErrorBody(createRes)}` };
}
