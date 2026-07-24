import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GitCommandRunner, GitStepResult } from "../../lib/git/types";
import { GitScopeError, commitAll, ensureRepoInitialized, pushToRemote } from "../../lib/git/client";

/**
 * Creates a fresh temp dir with an empty `.git` directory already present (a lightweight stand-in
 * for "cwd is already its own git repo" — enough to satisfy `assertOwnRepoScope()`'s
 * `fs.existsSync(path.join(cwd, ".git"))` check without spawning a real `git init`). Used by the
 * fake-runner unit tests below that only care about call sequencing, not real git state.
 */
function mkTempDirWithFakeGit(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
  fs.mkdirSync(path.join(dir, ".git"));
  return dir;
}

/** Fake runner that answers `rev-parse --show-toplevel` with `dir` itself (scope check passes). */
function runnerWithMatchingToplevel(
  dir: string,
  calls: string[][],
  overrides: (args: string[]) => GitStepResult | undefined
): GitCommandRunner {
  return async (args) => {
    calls.push(args);
    const override = overrides(args);
    if (override) return override;
    if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return { success: true, stdout: dir };
    return { success: true };
  };
}

describe("Git client — lib/git/client.ts (AI Business OS Rewiring Phase 3, fake runner)", () => {
  let tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
    tmpDirs = [];
  });

  describe("ensureRepoInitialized()", () => {
    it("does nothing extra (no 'init' call) when cwd already has its own .git and toplevel matches", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner = runnerWithMatchingToplevel(dir, calls, () => undefined);

      const result = await ensureRepoInitialized(dir, runner);

      expect(result.success).toBe(true);
      expect(calls).toEqual([["rev-parse", "--show-toplevel"]]);
    });

    it("runs git init when cwd has no .git yet, then verifies the resulting scope", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        if (args[0] === "init") {
          fs.mkdirSync(path.join(dir, ".git")); // simulate what a real `git init` does on disk
          return { success: true };
        }
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") return { success: true, stdout: dir };
        return { success: true };
      };

      const result = await ensureRepoInitialized(dir, runner);

      expect(result.success).toBe(true);
      expect(calls).toEqual([["init"], ["rev-parse", "--show-toplevel"]]);
    });

    it("returns failure (not a scope error) when git init itself fails", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      tmpDirs.push(dir);
      const runner: GitCommandRunner = async (args) => {
        if (args[0] === "init") return { success: false, error: "permission denied" };
        return { success: true };
      };

      const result = await ensureRepoInitialized(dir, runner);
      expect(result.success).toBe(false);
      expect(result.error).toBe("permission denied");
    });

    it("[Git Scope] throws GitScopeError when cwd has no .git and init doesn't actually create one", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      tmpDirs.push(dir);
      // A misbehaving runner that claims `init` succeeded without creating .git on disk — the
      // scope check must catch this rather than trusting the reported exit code.
      const runner: GitCommandRunner = async (args) => {
        if (args[0] === "init") return { success: true };
        return { success: true };
      };

      await expect(ensureRepoInitialized(dir, runner)).rejects.toThrow(GitScopeError);
    });

    it("[Git Scope] throws GitScopeError when git rev-parse --show-toplevel resolves to a different (parent) path", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const parentLikePath = path.dirname(dir);
      const runner: GitCommandRunner = async (args) => {
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return { success: true, stdout: parentLikePath };
        }
        return { success: true };
      };

      await expect(ensureRepoInitialized(dir, runner)).rejects.toThrow(GitScopeError);
    });
  });

  describe("commitAll()", () => {
    it("runs add then commit with an explicit user.name/email, in order (after the scope check)", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner = runnerWithMatchingToplevel(dir, calls, () => undefined);

      const result = await commitAll(dir, "Initial deployment", runner);

      expect(result.success).toBe(true);
      expect(calls[0]).toEqual(["rev-parse", "--show-toplevel"]);
      expect(calls[1]).toEqual(["add", "-A"]);
      expect(calls[2]).toEqual([
        "-c",
        "user.name=AI Business OS",
        "-c",
        "user.email=deploy@cnbiz.kr",
        "commit",
        "-m",
        "Initial deployment",
      ]);
    });

    it("stops and returns failure if add fails, without attempting commit", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner = runnerWithMatchingToplevel(dir, calls, (args) =>
        args[0] === "add" ? { success: false, error: "add failed" } : undefined
      );

      const result = await commitAll(dir, "msg", runner);

      expect(result.success).toBe(false);
      // rev-parse (scope check) + add — commit must never be reached.
      expect(calls).toEqual([
        ["rev-parse", "--show-toplevel"],
        ["add", "-A"],
      ]);
    });

    it("treats 'nothing to commit' as success (idempotent retry)", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const runner = runnerWithMatchingToplevel(dir, [], (args) => {
        if (args[0] === "add") return { success: true };
        if (args.includes("commit")) {
          return { success: false, error: "nothing to commit, working tree clean" };
        }
        return undefined;
      });

      const result = await commitAll(dir, "msg", runner);
      expect(result.success).toBe(true);
    });

    it("propagates a real commit failure that isn't 'nothing to commit'", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const runner = runnerWithMatchingToplevel(dir, [], (args) => {
        if (args[0] === "add") return { success: true };
        if (args.includes("commit")) {
          return { success: false, error: "fatal: unable to write commit object" };
        }
        return undefined;
      });

      const result = await commitAll(dir, "msg", runner);
      expect(result.success).toBe(false);
      expect(result.error).toContain("unable to write commit object");
    });

    it("[Git Scope] throws GitScopeError and never calls add/commit when cwd has no .git of its own", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: true };
      };

      await expect(commitAll(dir, "msg", runner)).rejects.toThrow(GitScopeError);
      // No git command at all should have been attempted — the fs check fails before any spawn.
      expect(calls).toHaveLength(0);
    });

    it("[Git Scope] throws GitScopeError and never calls add/commit when toplevel resolves elsewhere", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        if (args[0] === "rev-parse" && args[1] === "--show-toplevel") {
          return { success: true, stdout: "/some/unrelated/monorepo/root" };
        }
        return { success: true };
      };

      await expect(commitAll(dir, "msg", runner)).rejects.toThrow(GitScopeError);
      expect(calls).toEqual([["rev-parse", "--show-toplevel"]]);
    });
  });

  describe("pushToRemote()", () => {
    it("embeds the token as x-access-token in the push URL and never persists a remote", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner = runnerWithMatchingToplevel(dir, calls, () => undefined);

      const result = await pushToRemote(
        dir,
        "https://github.com/octocat/repo",
        "secret-token-123",
        "main",
        runner
      );

      expect(result.success).toBe(true);
      expect(calls).toHaveLength(2); // rev-parse (scope check) + push
      expect(calls[1][0]).toBe("push");
      expect(calls[1][1]).toBe("https://x-access-token:secret-token-123@github.com/octocat/repo");
      expect(calls[1][2]).toBe("HEAD:main");
      // 어떤 호출에도 "git remote add"가 없다 — 토큰이 .git/config에 영구 기록되지 않는다.
      expect(calls.some((call) => call[0] === "remote")).toBe(false);
    });

    it("defaults branch to main", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner = runnerWithMatchingToplevel(dir, calls, () => undefined);

      await pushToRemote(dir, "https://github.com/o/r", "t", undefined, runner);
      expect(calls[1][2]).toBe("HEAD:main");
    });

    it("propagates failure from the runner", async () => {
      const dir = mkTempDirWithFakeGit();
      tmpDirs.push(dir);
      const runner = runnerWithMatchingToplevel(dir, [], (args) =>
        args[0] === "push" ? { success: false, error: "authentication failed" } : undefined
      );

      const result = await pushToRemote(dir, "https://github.com/o/r", "bad-token", "main", runner);
      expect(result.success).toBe(false);
      expect(result.error).toBe("authentication failed");
    });

    it("[Git Scope] throws GitScopeError and never pushes when cwd has no .git of its own", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      tmpDirs.push(dir);
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: true };
      };

      await expect(
        pushToRemote(dir, "https://github.com/o/r", "token", "main", runner)
      ).rejects.toThrow(GitScopeError);
      expect(calls.some((call) => call[0] === "push")).toBe(false);
    });
  });
});

describe("Git client — real git subprocess integration (no network, local-only steps)", () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-integration-"));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("[real git] ensureRepoInitialized() + commitAll() actually create a commit on disk", async () => {
    const init: GitStepResult = await ensureRepoInitialized(dir);
    expect(init.success).toBe(true);
    expect(fs.existsSync(path.join(dir, ".git"))).toBe(true);

    fs.writeFileSync(path.join(dir, "index.html"), "<h1>hello</h1>");

    const commit = await commitAll(dir, "Initial deployment via AI Business OS");
    expect(commit.success).toBe(true);

    // 두 번째 호출(변경사항 없음)도 실패로 취급되지 않아야 한다.
    const secondCommit = await commitAll(dir, "no-op retry");
    expect(secondCommit.success).toBe(true);

    // 실제로 커밋이 존재하는지 두 번째 ensureRepoInitialized 호출(이미 작업 트리)로 재확인.
    const reInit = await ensureRepoInitialized(dir);
    expect(reInit.success).toBe(true);
  });

  it("[real git] ensureRepoInitialized() makes outDir its own repo — git rev-parse --show-toplevel resolves to outDir itself", async () => {
    await ensureRepoInitialized(dir);

    const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir, encoding: "utf-8" }).trim();
    const normalize = (p: string) => path.resolve(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

    expect(normalize(toplevel)).toBe(normalize(dir));
  });
});

/**
 * Git Scope 회귀 테스트 (GIT_SCOPE_FIX_REPORT.md) — 실제 있었던 사고를 재현하는 시나리오: `outDir`가
 * 이미 git 저장소인 상위 디렉터리 안에 중첩되어 있을 때(=이 저장소에서 실제로 벌어졌던 상황,
 * `.generated-websites/{jobId}`가 `ai-web-master` 저장소 내부에 있는 것과 동일한 구조), 고쳐진
 * `ensureRepoInitialized()`/`commitAll()`가 `outDir`를 독립 저장소로 만들고 그 안의 파일만
 * 커밋하는지, 상위 저장소는 전혀 건드리지 않는지를 실제 git 서브프로세스로 검증한다.
 */
describe("Git Scope regression — outDir stays independent even when nested inside a real parent repository", () => {
  let parentDir: string;
  let outDir: string;

  beforeEach(() => {
    parentDir = fs.mkdtempSync(path.join(os.tmpdir(), "git-scope-parent-"));

    // 상위 저장소를 실제로 초기화하고 커밋 1개를 만든다 — "이미 커밋 이력이 있는 ai-web-master
    // 모노레포"를 흉내낸다. 실제 저장소의 .gitignore가 `/.generated-websites/`를 제외하는 것과
    // 동일하게 맞춰, "생성물 폴더 자체가 상위에서 미추적으로 보이는 것"이 아니라 "상위 저장소의
    // 커밋된 이력이 전혀 건드려지지 않는 것"을 검증하는 데 집중한다.
    execFileSync("git", ["init"], { cwd: parentDir });
    fs.writeFileSync(path.join(parentDir, ".gitignore"), "/.generated-websites/\n");
    fs.writeFileSync(path.join(parentDir, "root-file.txt"), "this belongs to the parent monorepo\n");
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "add", "-A"],
      { cwd: parentDir }
    );
    execFileSync(
      "git",
      ["-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "root commit"],
      { cwd: parentDir }
    );

    // outDir는 그 상위 저장소 "안에" 있지만, 아직 자신만의 .git은 없다 — 실제
    // `.generated-websites/{jobId}`와 정확히 같은 구조.
    outDir = path.join(parentDir, ".generated-websites", "job-regression-test");
    fs.mkdirSync(outDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(parentDir, { recursive: true, force: true });
  });

  it("1) outDir becomes its own independent git repository after ensureRepoInitialized()", async () => {
    const result = await ensureRepoInitialized(outDir);
    expect(result.success).toBe(true);

    // outDir 자신에 .git이 생겼다 — 상위 저장소의 .git을 재사용하지 않았다.
    expect(fs.existsSync(path.join(outDir, ".git"))).toBe(true);

    const toplevel = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: outDir,
      encoding: "utf-8",
    }).trim();
    const normalize = (p: string) => path.resolve(p).replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();

    expect(normalize(toplevel)).toBe(normalize(outDir));
    expect(normalize(toplevel)).not.toBe(normalize(parentDir));
  });

  it("2) commitAll(outDir) commits ONLY outDir's own file — the parent monorepo's file is never staged, and the parent's history is untouched", async () => {
    await ensureRepoInitialized(outDir);

    fs.writeFileSync(path.join(outDir, "site-file.txt"), "generated website content\n");

    const commit = await commitAll(outDir, "Initial deployment via AI Business OS");
    expect(commit.success).toBe(true);

    // outDir 저장소의 최신 커밋에 포함된 파일 목록 — site-file.txt만 있어야 하고, 상위 저장소의
    // root-file.txt·agents/*·workflows/* 같은 것은 절대 섞여 들어가면 안 된다.
    const filesInCommit = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], {
      cwd: outDir,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    expect(filesInCommit).toEqual(["site-file.txt"]);
    expect(filesInCommit).not.toContain("root-file.txt");

    // 상위 저장소는 이번 작업으로 전혀 건드려지지 않았다 — 여전히 커밋 1개, working tree clean.
    const parentLog = execFileSync("git", ["log", "--oneline"], { cwd: parentDir, encoding: "utf-8" }).trim();
    expect(parentLog.split("\n")).toHaveLength(1);

    const parentStatus = execFileSync("git", ["status", "--porcelain"], {
      cwd: parentDir,
      encoding: "utf-8",
    }).trim();
    expect(parentStatus).toBe("");
  });

  it("3) even if the parent repo has additional untracked files (simulating scratch artifacts left in the monorepo), they are never swept into outDir's commit", async () => {
    // 이번 사고에서 실제로 벌어졌던 것과 동일한 상황: 상위 저장소에 아직 커밋되지 않은 미추적
    // 파일들이 남아 있는 상태(예: 세션 중 작성된 리포트 파일들).
    fs.writeFileSync(path.join(parentDir, "SOME_REPORT.md"), "unrelated in-progress report\n");
    fs.mkdirSync(path.join(parentDir, "agents", "some-scaffolding"), { recursive: true });
    fs.writeFileSync(path.join(parentDir, "agents", "some-scaffolding", "AGENT.md"), "scaffolding\n");

    await ensureRepoInitialized(outDir);
    fs.writeFileSync(path.join(outDir, "site-file.txt"), "generated website content\n");
    const commit = await commitAll(outDir, "Initial deployment via AI Business OS");
    expect(commit.success).toBe(true);

    const filesInCommit = execFileSync("git", ["show", "--name-only", "--format=", "HEAD"], {
      cwd: outDir,
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // outDir 커밋에는 여전히 outDir 자신의 파일만 있어야 한다 — 상위의 미추적 파일들은 전혀
    // 섞이지 않는다(이번 사고에서 실제로 섞였던 것과 정반대 결과를 검증).
    expect(filesInCommit).toEqual(["site-file.txt"]);

    // 상위 저장소의 미추적 파일들은 여전히 미추적 상태로 그대로 남아 있다(건드려지지 않음).
    const parentStatus = execFileSync("git", ["status", "--porcelain"], {
      cwd: parentDir,
      encoding: "utf-8",
    }).trim();
    expect(parentStatus).toContain("SOME_REPORT.md");
    expect(parentStatus).toContain("agents/");
  });
});
