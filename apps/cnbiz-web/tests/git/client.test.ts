import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import type { GitTargetRepo } from "../../lib/git/types";
import { commitAll, ensureRepoInitialized, pushToRemote } from "../../lib/git/client";
import { createRepository } from "../../lib/github/client";

const REPO: GitTargetRepo = { owner: "cnbiz-customers", name: "restaurant-a1b2c3d4" };

describe("Git client — lib/git/client.ts (GitHub Git Data API 기반, 2026-09-17 재구현)", () => {
  describe("ensureRepoInitialized()", () => {
    it("succeeds when cwd exists and is a directory", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      try {
        const result = await ensureRepoInitialized(dir);
        expect(result).toEqual({ success: true });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("fails when cwd does not exist", async () => {
      const missing = path.join(os.tmpdir(), "git-client-unit-does-not-exist-xyz");
      const result = await ensureRepoInitialized(missing);
      expect(result.success).toBe(false);
      expect(result.error).toContain(missing);
    });

    it("fails when cwd is a file, not a directory", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      const filePath = path.join(dir, "not-a-dir.txt");
      fs.writeFileSync(filePath, "x");
      try {
        const result = await ensureRepoInitialized(filePath);
        expect(result.success).toBe(false);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("commitAll()", () => {
    function mkTempDirWithFiles(files: Record<string, string>): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      for (const [relPath, content] of Object.entries(files)) {
        const fullPath = path.join(dir, relPath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, content);
      }
      return dir;
    }

    it("creates a blob per file, then a tree, then a parentless root commit, and returns the commit sha", async () => {
      const dir = mkTempDirWithFiles({
        "index.html": "<h1>hello</h1>",
        "app/page.tsx": "export default function Page() {}",
      });

      const calls: { url: string; body: Record<string, unknown> }[] = [];
      const fakeFetch = async (url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        calls.push({ url, body });

        if (url.endsWith("/git/blobs")) {
          return new Response(JSON.stringify({ sha: `blob-${calls.length}` }), { status: 201 });
        }
        if (url.endsWith("/git/trees")) {
          return new Response(JSON.stringify({ sha: "tree-sha" }), { status: 201 });
        }
        if (url.endsWith("/git/commits")) {
          return new Response(JSON.stringify({ sha: "commit-sha" }), { status: 201 });
        }
        throw new Error(`unexpected url: ${url}`);
      };

      try {
        const result = await commitAll(dir, "Initial deployment", REPO, "tok", fakeFetch);

        expect(result).toEqual({ success: true, stdout: "commit-sha" });

        const blobCalls = calls.filter((c) => c.url.endsWith("/git/blobs"));
        expect(blobCalls).toHaveLength(2);
        expect(blobCalls.every((c) => c.body.encoding === "base64")).toBe(true);

        const treeCall = calls.find((c) => c.url.endsWith("/git/trees"))!;
        const treePaths = (treeCall.body.tree as { path: string }[]).map((e) => e.path).sort();
        expect(treePaths).toEqual(["app/page.tsx", "index.html"]);

        const commitCall = calls.find((c) => c.url.endsWith("/git/commits"))!;
        expect(commitCall.body.tree).toBe("tree-sha");
        expect(commitCall.body.parents).toEqual([]); // root commit — no parent
        expect(commitCall.body.message).toBe("Initial deployment");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("skips .git and node_modules directories if present", async () => {
      const dir = mkTempDirWithFiles({
        "index.html": "content",
        ".git/HEAD": "ref: refs/heads/main",
        "node_modules/pkg/index.js": "module.exports = {}",
      });

      const calls: { url: string }[] = [];
      const fakeFetch = async (url: string) => {
        calls.push({ url });
        if (url.endsWith("/git/blobs")) return new Response(JSON.stringify({ sha: "b" }), { status: 201 });
        if (url.endsWith("/git/trees")) return new Response(JSON.stringify({ sha: "t" }), { status: 201 });
        return new Response(JSON.stringify({ sha: "c" }), { status: 201 });
      };

      try {
        await commitAll(dir, "msg", REPO, "tok", fakeFetch);
        const blobCallCount = calls.filter((c) => c.url.endsWith("/git/blobs")).length;
        expect(blobCallCount).toBe(1); // only index.html
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("fails without calling tree/commit when a blob upload fails", async () => {
      const dir = mkTempDirWithFiles({ "index.html": "content" });

      let treeOrCommitCalled = false;
      const fakeFetch = async (url: string) => {
        if (url.endsWith("/git/blobs")) {
          return new Response("rate limited", { status: 403 });
        }
        treeOrCommitCalled = true;
        return new Response(JSON.stringify({ sha: "x" }), { status: 201 });
      };

      try {
        const result = await commitAll(dir, "msg", REPO, "tok", fakeFetch);
        expect(result.success).toBe(false);
        expect(result.error).toContain("blob 생성 실패");
        expect(treeOrCommitCalled).toBe(false);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("fails when the tree creation request fails", async () => {
      const dir = mkTempDirWithFiles({ "index.html": "content" });
      const fakeFetch = async (url: string) => {
        if (url.endsWith("/git/blobs")) return new Response(JSON.stringify({ sha: "b" }), { status: 201 });
        if (url.endsWith("/git/trees")) return new Response("bad request", { status: 422 });
        return new Response(JSON.stringify({ sha: "c" }), { status: 201 });
      };

      try {
        const result = await commitAll(dir, "msg", REPO, "tok", fakeFetch);
        expect(result.success).toBe(false);
        expect(result.error).toContain("tree 생성 실패");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("fails when the commit creation request fails", async () => {
      const dir = mkTempDirWithFiles({ "index.html": "content" });
      const fakeFetch = async (url: string) => {
        if (url.endsWith("/git/blobs")) return new Response(JSON.stringify({ sha: "b" }), { status: 201 });
        if (url.endsWith("/git/trees")) return new Response(JSON.stringify({ sha: "t" }), { status: 201 });
        return new Response("server error", { status: 500 });
      };

      try {
        const result = await commitAll(dir, "msg", REPO, "tok", fakeFetch);
        expect(result.success).toBe(false);
        expect(result.error).toContain("commit 생성 실패");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("fails when there are no files to commit", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-unit-"));
      try {
        const result = await commitAll(dir, "msg", REPO, "tok", async () => {
          throw new Error("should not be called");
        });
        expect(result.success).toBe(false);
        expect(result.error).toContain("커밋할 파일이 없습니다");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("pushToRemote()", () => {
    it("creates the branch ref pointing at the commit sha (fresh repo, ref does not exist yet)", async () => {
      const calls: { url: string; method?: string; body: Record<string, unknown> }[] = [];
      const fakeFetch = async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method, body: JSON.parse(String(init?.body)) });
        return new Response(JSON.stringify({ ref: "refs/heads/main" }), { status: 201 });
      };

      const result = await pushToRemote("commit-sha", REPO, "tok", "main", fakeFetch);

      expect(result).toEqual({ success: true });
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(
        `https://api.github.com/repos/${REPO.owner}/${REPO.name}/git/refs`
      );
      expect(calls[0].method).toBe("POST");
      expect(calls[0].body).toEqual({ ref: "refs/heads/main", sha: "commit-sha" });
    });

    it("defaults branch to main", async () => {
      const fakeFetch = async () => new Response(JSON.stringify({}), { status: 201 });
      const result = await pushToRemote("sha", REPO, "tok", undefined, fakeFetch);
      expect(result.success).toBe(true);
    });

    it("falls back to updating the ref when it already exists (422)", async () => {
      const calls: { url: string; method?: string }[] = [];
      const fakeFetch = async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method });
        if (init?.method === "POST") return new Response("already exists", { status: 422 });
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const result = await pushToRemote("commit-sha", REPO, "tok", "main", fakeFetch);

      expect(result).toEqual({ success: true });
      expect(calls).toEqual([
        { url: `https://api.github.com/repos/${REPO.owner}/${REPO.name}/git/refs`, method: "POST" },
        {
          url: `https://api.github.com/repos/${REPO.owner}/${REPO.name}/git/refs/heads/main`,
          method: "PATCH",
        },
      ]);
    });

    it("propagates failure when both create and update fail", async () => {
      const fakeFetch = async (_url: string, init?: RequestInit) => {
        if (init?.method === "POST") return new Response("already exists", { status: 422 });
        return new Response("forbidden", { status: 403 });
      };

      const result = await pushToRemote("sha", REPO, "tok", "main", fakeFetch);
      expect(result.success).toBe(false);
      expect(result.error).toContain("ref 갱신 실패");
    });

    it("propagates failure when ref creation fails for a reason other than 'already exists'", async () => {
      const fakeFetch = async () => new Response("forbidden", { status: 403 });
      const result = await pushToRemote("sha", REPO, "tok", "main", fakeFetch);
      expect(result.success).toBe(false);
      expect(result.error).toContain("ref 생성 실패");
    });
  });

  describe("commitAll() + pushToRemote() end-to-end against a stateful fake GitHub server", () => {
    /**
     * lib/deployment/pipeline.ts가 실제로 하는 것과 동일한 순서(commitAll → 그 결과의 stdout을
     * pushToRemote로 전달)를 재현한다. 실제 blob/tree/commit SHA를 계산해 저장하는 최소 인메모리
     * GitHub Git Data API 스텁이라, 두 함수의 데이터 핸드오프(commitAll이 반환한 commit SHA가
     * pushToRemote가 실제로 참조를 옮기는 대상과 정확히 일치하는지) 자체를 검증한다.
     */
    it("wires commitAll's returned commit sha into pushToRemote's ref update, end to end", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-e2e-"));
      fs.writeFileSync(path.join(dir, "index.html"), "<h1>hello</h1>");
      fs.mkdirSync(path.join(dir, "app"));
      fs.writeFileSync(path.join(dir, "app", "page.tsx"), "export default function Page() {}");

      const blobs = new Map<string, string>();
      const trees = new Map<string, unknown>();
      const commits = new Map<string, unknown>();
      const refs = new Map<string, string>();
      let seq = 0;
      const nextSha = () => `sha-${++seq}`;

      const fakeGitHubFetch = async (url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const method = init?.method ?? "GET";

        if (url.endsWith("/git/blobs")) {
          const sha = nextSha();
          blobs.set(sha, body.content);
          return new Response(JSON.stringify({ sha }), { status: 201 });
        }
        if (url.endsWith("/git/trees")) {
          const sha = nextSha();
          trees.set(sha, body.tree);
          return new Response(JSON.stringify({ sha }), { status: 201 });
        }
        if (url.endsWith("/git/commits")) {
          const sha = nextSha();
          commits.set(sha, body);
          return new Response(JSON.stringify({ sha }), { status: 201 });
        }
        if (url.endsWith("/git/refs") && method === "POST") {
          if (refs.has(body.ref)) return new Response("already exists", { status: 422 });
          refs.set(body.ref, body.sha);
          return new Response(JSON.stringify({ ref: body.ref }), { status: 201 });
        }
        throw new Error(`unexpected fake GitHub call: ${method} ${url}`);
      };

      try {
        const commitResult = await commitAll(dir, "Initial deployment via AI Business OS", REPO, "tok", fakeGitHubFetch);
        expect(commitResult.success).toBe(true);
        expect(commitResult.stdout).toBeTruthy();

        // commit이 참조하는 tree에 두 파일이 정확히 들어있는지 확인.
        const commitBody = commits.get(commitResult.stdout!) as { tree: string; parents: string[] };
        expect(commitBody.parents).toEqual([]);
        const treeEntries = trees.get(commitBody.tree) as { path: string; sha: string }[];
        expect(treeEntries.map((e) => e.path).sort()).toEqual(["app/page.tsx", "index.html"]);
        // 각 tree entry의 blob 내용이 실제 파일 내용(base64)과 일치하는지 확인.
        const indexEntry = treeEntries.find((e) => e.path === "index.html")!;
        expect(Buffer.from(blobs.get(indexEntry.sha)!, "base64").toString("utf-8")).toBe("<h1>hello</h1>");

        const pushResult = await pushToRemote(commitResult.stdout!, REPO, "tok", "main", fakeGitHubFetch);
        expect(pushResult).toEqual({ success: true });
        expect(refs.get("refs/heads/main")).toBe(commitResult.stdout);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  });

  describe("regression — GitHub의 'Git Repository is empty' 409 (createRepository()의 auto_init:true로 수정, 2026-09-17)", () => {
    /**
     * 실제 프로덕션에서 재현된 순서를 그대로 재현한다: createRepository()로 저장소를 만든 뒤
     * commitAll()로 blob을 생성한다. 이 fake 서버는 GitHub의 실제 제약(완전히 커밋이 없는
     * 저장소에는 blob 생성 자체가 409로 거부됨)을 모델링해, `auto_init: false`로 만든 저장소에
     * 대고는 실제로 재현된 것과 동일한 409를 반환하고, `auto_init: true`로 만든 저장소(최소
     * 1개의 초기 커밋이 있음)에 대고는 정상 동작하는지를 검증한다.
     */
    function createFakeGitHubServer() {
      const reposWithAtLeastOneCommit = new Set<string>();
      let refExists = false;

      const fetchFn = async (url: string, init?: RequestInit) => {
        const method = init?.method ?? "GET";
        const body = init?.body ? JSON.parse(String(init.body)) : {};

        if (url.endsWith("/user/repos") && method === "POST") {
          if (body.auto_init) reposWithAtLeastOneCommit.add(body.name);
          return new Response(
            JSON.stringify({
              id: 1,
              name: body.name,
              full_name: `${REPO.owner}/${body.name}`,
              html_url: `https://github.com/${REPO.owner}/${body.name}`,
              clone_url: `https://github.com/${REPO.owner}/${body.name}.git`,
              default_branch: "main",
            }),
            { status: 201 }
          );
        }

        if (url.endsWith("/git/blobs")) {
          if (!reposWithAtLeastOneCommit.has(REPO.name)) {
            return new Response(JSON.stringify({ message: "Git Repository is empty." }), { status: 409 });
          }
          return new Response(JSON.stringify({ sha: "blob-sha" }), { status: 201 });
        }
        if (url.endsWith("/git/trees")) return new Response(JSON.stringify({ sha: "tree-sha" }), { status: 201 });
        if (url.endsWith("/git/commits")) return new Response(JSON.stringify({ sha: "commit-sha" }), { status: 201 });
        if (url.endsWith("/git/refs") && method === "POST") {
          if (refExists) return new Response("already exists", { status: 422 });
          refExists = true;
          return new Response(JSON.stringify({}), { status: 201 });
        }

        throw new Error(`unexpected fake GitHub call: ${method} ${url}`);
      };

      return { fetchFn };
    }

    it("reproduces the original production failure against a repo with zero commits (the old auto_init:false state)", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-regression-"));
      fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules\n");

      try {
        // lib/github/client.ts의 createRepository()는 이제 항상 auto_init:true를 보내 이
        // 시나리오 자체는 프로덕션 코드 경로로는 더 이상 도달하지 않는다 — 그 이전 상태(완전히
        // 커밋이 없는 저장소)를 fake 서버로 직접 구성해, "고치기 전에는 이 순서로 정확히 이
        // 오류가 났다"는 것을 재현해 남겨 회귀를 방지한다.
        const { fetchFn } = createFakeGitHubServer(); // 아무 repo도 커밋 상태로 표시하지 않음 = 빈 저장소
        const result = await commitAll(dir, "Initial deployment via AI Business OS", REPO, "tok", fetchFn);

        expect(result.success).toBe(false);
        expect(result.error).toContain("blob 생성 실패");
        expect(result.error).toContain("Git Repository is empty");
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("succeeds end-to-end when createRepository() uses auto_init:true (the actual fix)", async () => {
      process.env.GITHUB_TOKEN = "fake-token";
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "git-client-regression-"));
      fs.writeFileSync(path.join(dir, "index.html"), "<h1>hello</h1>");

      try {
        const { fetchFn } = createFakeGitHubServer();
        const repo = await createRepository({ name: REPO.name, private: true }, fetchFn);

        const commitResult = await commitAll(dir, "Initial deployment via AI Business OS", repo, "tok", fetchFn);
        expect(commitResult.success).toBe(true);

        const pushResult = await pushToRemote(commitResult.stdout!, repo, "tok", "main", fetchFn);
        expect(pushResult).toEqual({ success: true });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
        delete process.env.GITHUB_TOKEN;
      }
    });
  });
});
