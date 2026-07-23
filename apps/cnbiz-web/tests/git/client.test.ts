import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GitCommandRunner, GitStepResult } from "../../lib/git/types";
import { commitAll, ensureRepoInitialized, pushToRemote } from "../../lib/git/client";

describe("Git client — lib/git/client.ts (AI Business OS Rewiring Phase 3, fake runner)", () => {
  describe("ensureRepoInitialized()", () => {
    it("does nothing (success) when already inside a work tree", async () => {
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: true };
      };

      const result = await ensureRepoInitialized("/fake/dir", runner);

      expect(result.success).toBe(true);
      expect(calls).toEqual([["rev-parse", "--is-inside-work-tree"]]);
    });

    it("runs git init when not yet a repository", async () => {
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        if (args[0] === "rev-parse") return { success: false, error: "not a git repository" };
        return { success: true };
      };

      const result = await ensureRepoInitialized("/fake/dir", runner);

      expect(result.success).toBe(true);
      expect(calls).toEqual([
        ["rev-parse", "--is-inside-work-tree"],
        ["init"],
      ]);
    });
  });

  describe("commitAll()", () => {
    it("runs add then commit with an explicit user.name/email, in order", async () => {
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: true };
      };

      const result = await commitAll("/fake/dir", "Initial deployment", runner);

      expect(result.success).toBe(true);
      expect(calls[0]).toEqual(["add", "-A"]);
      expect(calls[1]).toEqual([
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
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: false, error: "add failed" };
      };

      const result = await commitAll("/fake/dir", "msg", runner);

      expect(result.success).toBe(false);
      expect(calls).toHaveLength(1);
    });

    it("treats 'nothing to commit' as success (idempotent retry)", async () => {
      const runner: GitCommandRunner = async (args) => {
        if (args[0] === "add") return { success: true };
        return { success: false, error: "nothing to commit, working tree clean" };
      };

      const result = await commitAll("/fake/dir", "msg", runner);
      expect(result.success).toBe(true);
    });

    it("propagates a real commit failure that isn't 'nothing to commit'", async () => {
      const runner: GitCommandRunner = async (args) => {
        if (args[0] === "add") return { success: true };
        return { success: false, error: "fatal: unable to write commit object" };
      };

      const result = await commitAll("/fake/dir", "msg", runner);
      expect(result.success).toBe(false);
      expect(result.error).toContain("unable to write commit object");
    });
  });

  describe("pushToRemote()", () => {
    it("embeds the token as x-access-token in the push URL and never persists a remote", async () => {
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: true };
      };

      const result = await pushToRemote(
        "/fake/dir",
        "https://github.com/octocat/repo",
        "secret-token-123",
        "main",
        runner
      );

      expect(result.success).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe("push");
      expect(calls[0][1]).toBe("https://x-access-token:secret-token-123@github.com/octocat/repo");
      expect(calls[0][2]).toBe("HEAD:main");
      // 어떤 호출에도 "git remote add"가 없다 — 토큰이 .git/config에 영구 기록되지 않는다.
      expect(calls.some((call) => call[0] === "remote")).toBe(false);
    });

    it("defaults branch to main", async () => {
      const calls: string[][] = [];
      const runner: GitCommandRunner = async (args) => {
        calls.push(args);
        return { success: true };
      };

      await pushToRemote("/fake/dir", "https://github.com/o/r", "t", undefined, runner);
      expect(calls[0][2]).toBe("HEAD:main");
    });

    it("propagates failure from the runner", async () => {
      const runner: GitCommandRunner = async () => ({ success: false, error: "authentication failed" });
      const result = await pushToRemote("/fake/dir", "https://github.com/o/r", "bad-token", "main", runner);
      expect(result.success).toBe(false);
      expect(result.error).toBe("authentication failed");
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
});
