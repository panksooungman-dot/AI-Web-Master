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
 */
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

/** 이미 git 저장소면 그대로 두고(멱등), 아니면 초기화한다. */
export async function ensureRepoInitialized(
  cwd: string,
  runner: GitCommandRunner = defaultRunner
): Promise<GitStepResult> {
  const check = await runner(["rev-parse", "--is-inside-work-tree"], cwd);
  if (check.success) return { success: true };

  return runner(["init"], cwd);
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
  const authenticatedUrl = repositoryHtmlUrl.replace(/^https:\/\//, `https://x-access-token:${token}@`);
  return runner(["push", authenticatedUrl, `HEAD:${branch}`], cwd);
}
