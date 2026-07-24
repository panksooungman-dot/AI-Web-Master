import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import type { GitCommandRunner, GitStepResult } from "./types";

/**
 * AI Business OS Rewiring Phase 3 — 로컬 git 조작(생성된 사이트 산출물을 커밋·푸시).
 *
 * 의도적으로 lib/commandEngine/engine.ts의 execute()를 재사용하지 않는다 — 그 함수는 실행한
 * 명령 문자열 전체를 감사 이력(commandHistoryStore)·이벤트 버스에 그대로 기록하도록 설계되어
 * 있는데(Terminal/Git Manager 화면에서 사람이 실행한 명령을 보여주기 위한 용도), 이 모듈의
 * pushToRemote()는 GitHub 토큰이 포함된 URL을 인자로 다뤄야 한다. 토큰이 로그에 남는 것을
 * 원천적으로 막기 위해, git을 인자 배열(argv)로 직접 spawn하는 별도의 최소 실행기를 둔다 —
 * 이 파일 안에서도 어떤 함수도 인자 자체를 로깅하지 않는다(호출자인
 * lib/deployment/pipeline.ts가 남기는 감사 로그에도 토큰 값은 절대 포함하지 않는다).
 *
 * ## Git Scope 안전장치 (GIT_SCOPE_FIX_REPORT.md 참고)
 *
 * 이전 버전은 `git rev-parse --is-inside-work-tree`로 "이미 초기화됐는지"를 판단했다. 이 명령은
 * `cwd`가 **어떤** 저장소든 작업 트리 내부에 있으면 성공을 반환하므로, `outDir`(생성된 사이트
 * 산출물 폴더)가 독립 `.git`을 가진 적이 없으면 이 저장소(`ai-web-master`)의 `.git`을 상위에서
 * 찾아내 "이미 초기화됨"으로 오판했다 — 그 결과 이어지는 `git add -A`/`git commit`이 `outDir`가
 * 아니라 **모노레포 전체**를 대상으로 실행되어, 실제로 로컬 `main` 브랜치에 저장소 전체를 담은
 * 잘못된 커밋이 만들어진 사고가 있었다(다행히 그 다음 push는 별도 사유로 실패해 GitHub 원격에는
 * 올라가지 않았다).
 *
 * 재발을 막기 위해 두 겹의 안전장치를 둔다:
 * 1. `ensureRepoInitialized()`는 이제 git 명령이 아니라 `fs.existsSync(path.join(cwd, ".git"))`
 *    **만으로** "cwd 자신이 독립 저장소인가"를 판단한다 — 상위 저장소의 존재 여부와 무관하게
 *    cwd 자신에 `.git`이 없으면 무조건 `git init`을 cwd에서 실행한다.
 * 2. `assertOwnRepoScope()`(아래, 비공개)를 `ensureRepoInitialized()`·`commitAll()`·
 *    `pushToRemote()` **세 함수 모두의 진입점**에서 각각 독립적으로 호출한다 — "cwd에 `.git`이
 *    있는가" + "`git rev-parse --show-toplevel`의 결과가 정확히 cwd와 같은가"를 확인해, 하나라도
 *    어긋나면 `GitScopeError`를 즉시 throw하고 어떤 git 명령도 실행하지 않는다. `ensureRepoInitialized()`
 *    호출을 빠뜨리거나 다른 경로로 우회해도 `commitAll()`/`pushToRemote()` 자체가 독립적으로
 *    막아서므로, 모노레포 루트를 대상으로 `git add`/`git commit`/`git push`가 실행될 가능성을
 *    구조적으로 차단한다.
 */

export class GitScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitScopeError";
  }
}

/** Windows(`\`)·POSIX(`/`) 구분자, 대소문자, trailing slash 차이를 흡수하고 절대 경로로 정규화한다. */
function normalizeForComparison(candidate: string): string {
  return path
    .resolve(candidate)
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/**
 * `cwd`가 "그 자신의" git 저장소 최상위인지 확인한다. 아래 둘 중 하나라도 아니면 `GitScopeError`를
 * throw한다(반환하지 않음 — 호출자가 실수로 반환값 검사를 빠뜨려도 안전하도록):
 * - `cwd` 바로 아래 `.git`이 없다(독립 저장소가 아니라 상위 저장소의 작업 트리 내부일 뿐)
 * - `git rev-parse --show-toplevel`의 결과가 `cwd`와 다르다(예: 상위 저장소를 가리킴)
 */
async function assertOwnRepoScope(cwd: string, runner: GitCommandRunner): Promise<void> {
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    throw new GitScopeError(
      `Git 스코프 위반: "${cwd}"에 독립된 .git이 없습니다. 상위 저장소를 대상으로 git 명령이 ` +
        `실행되는 것을 방지하기 위해 중단합니다.`
    );
  }

  const toplevel = await runner(["rev-parse", "--show-toplevel"], cwd);
  if (!toplevel.success) {
    throw new GitScopeError(
      `Git 스코프 확인 실패: "${cwd}"에서 "git rev-parse --show-toplevel" 실행에 실패했습니다 ` +
        `(${toplevel.error ?? "알 수 없는 오류"}).`
    );
  }

  const actualToplevel = (toplevel.stdout ?? "").trim();
  if (normalizeForComparison(actualToplevel) !== normalizeForComparison(cwd)) {
    throw new GitScopeError(
      `Git 스코프 위반: "${cwd}"의 저장소 최상위가 "${actualToplevel}"입니다(기대값: "${cwd}"). ` +
        `상위 저장소 전체가 commit/push 대상이 되는 것을 방지하기 위해 중단합니다.`
    );
  }
}

function defaultRunner(args: string[], cwd: string): Promise<GitStepResult> {
  return new Promise((resolve) => {
    const child = spawn("git", args, { cwd, windowsHide: true });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      resolve({ success: false, error: error.message });
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        stdout,
        error: code === 0 ? undefined : stderr.trim() || `git ${args[0] ?? ""} 종료 코드 ${code}`,
      });
    });
  });
}

/**
 * `cwd` 자신에 `.git`이 없으면(상위 저장소의 존재 여부와 무관하게) `cwd`에서 `git init`을
 * 실행해 독립 저장소로 만든다. 이미 `.git`이 있으면 멱등하게 아무것도 하지 않는다. 어느 경우든
 * 마지막에 `assertOwnRepoScope()`로 실제로 `cwd`가 자신의 저장소 최상위가 됐는지 재확인한다 —
 * 여기서 어긋나면 `GitScopeError`를 throw한다(반환값 아님, 위 클래스 설명 참고).
 */
export async function ensureRepoInitialized(
  cwd: string,
  runner: GitCommandRunner = defaultRunner
): Promise<GitStepResult> {
  if (!fs.existsSync(path.join(cwd, ".git"))) {
    const init = await runner(["init"], cwd);
    if (!init.success) return init;
  }

  await assertOwnRepoScope(cwd, runner);

  return { success: true };
}

/**
 * 산출물 전체를 커밋한다. 저장소별 전역 git 설정을 건드리지 않도록 커밋마다
 * `-c user.name=`/`-c user.email=`을 명시한다(새로 생성된 로컬 폴더에는 git 사용자 설정이
 * 없을 수 있음).
 */
export async function commitAll(
  cwd: string,
  message: string,
  runner: GitCommandRunner = defaultRunner
): Promise<GitStepResult> {
  // ensureRepoInitialized() 호출 여부와 무관하게 독립적으로 재확인한다 — 이 함수 하나만으로도
  // 루트 저장소(모노레포)를 대상으로 git add/commit이 실행되는 것을 막는다.
  await assertOwnRepoScope(cwd, runner);

  const add = await runner(["add", "-A"], cwd);
  if (!add.success) return add;

  const commit = await runner(
    ["-c", "user.name=AI Business OS", "-c", "user.email=deploy@cnbiz.kr", "commit", "-m", message],
    cwd
  );

  // 재시도 등으로 변경사항이 전혀 없는 상태에서 다시 호출되어도 실패로 취급하지 않는다.
  // git commit은 이 메시지를 대부분 stdout으로 출력하므로(stderr가 아님) 둘 다 확인한다.
  if (!commit.success && /nothing to commit/i.test(`${commit.stdout ?? ""}\n${commit.error ?? ""}`)) {
    return { success: true };
  }

  return commit;
}

/**
 * 커밋된 내용을 GitHub 저장소로 push한다. 인증은 `x-access-token:<token>@`를 담은 URL로만
 * 이뤄지며, 이 URL은 `git remote add`로 `.git/config`에 영구 기록하지 않는다(그 파일이 나중에
 * 어디로든 복사·백업될 경우의 토큰 유출 위험을 없애기 위함) — push 호출 한 번의 인자로만
 * 존재했다가 사라진다.
 */
export async function pushToRemote(
  cwd: string,
  repositoryHtmlUrl: string,
  token: string,
  branch = "main",
  runner: GitCommandRunner = defaultRunner
): Promise<GitStepResult> {
  // commitAll()과 동일한 이유로 독립적으로 재확인한다 — 이 함수 하나만으로도 루트 저장소를
  // 대상으로 push가 실행되는 것을 막는다(가장 되돌리기 어려운 단계이므로 마지막 방어선).
  await assertOwnRepoScope(cwd, runner);

  const authenticatedUrl = repositoryHtmlUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);
  return runner(["push", authenticatedUrl, `HEAD:${branch}`], cwd);
}
