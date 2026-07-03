"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspaceStore } from "@/lib/store/workspace-store";

interface TerminalApiResponse {
  success: boolean;
  output?: string;
  error?: string;
  cwd?: string;
}

interface GitStatusBuckets {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
}

interface ActionResult {
  label: string;
  success: boolean;
  text: string;
}

const EMPTY_BUCKETS: GitStatusBuckets = {
  modified: [],
  added: [],
  deleted: [],
  untracked: [],
};

function parseGitStatus(porcelain: string): GitStatusBuckets {
  const buckets: GitStatusBuckets = {
    modified: [],
    added: [],
    deleted: [],
    untracked: [],
  };

  porcelain.split(/\r?\n/).forEach((line) => {
    if (!line.trim()) return;

    const code = line.slice(0, 2);
    const file = line.slice(3).trim();

    if (code === "??") {
      buckets.untracked.push(file);
    } else if (code.includes("A")) {
      buckets.added.push(file);
    } else if (code.includes("D")) {
      buckets.deleted.push(file);
    } else if (code.includes("M") || code.includes("R") || code.includes("C")) {
      buckets.modified.push(file);
    }
  });

  return buckets;
}

function parseCurrentBranch(branchOutput: string): string {
  const lines = branchOutput.split(/\r?\n/);
  const current = lines.find((line) => line.trim().startsWith("*"));

  if (current) return current.replace("*", "").trim();

  return lines.find((line) => line.trim())?.trim() ?? "(알 수 없음)";
}

function parseRemoteUrl(remoteOutput: string): string | null {
  const line = remoteOutput.split(/\r?\n/).find((entry) => entry.includes("(fetch)"));
  if (!line) return null;

  const parts = line.trim().split(/\s+/);
  return parts.length >= 2 ? parts[1] : null;
}

function deriveRepoName(remoteUrl: string | null, cwd: string | null): string {
  if (remoteUrl) {
    const cleaned = remoteUrl.replace(/\.git$/, "");
    const segments = cleaned.split(/[\\/]/).filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1];
  }

  if (cwd) {
    const segments = cwd.split(/[\\/]/).filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1];
  }

  return "(알 수 없음)";
}

export default function GitHubManagerPage() {
  const { currentWorkspace, isHydrated } = useWorkspaceStore();
  const [cwd, setCwd] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated) return;

    if (currentWorkspace) {
      queueMicrotask(() => setCwd(currentWorkspace.path));
      return;
    }

    fetch("/api/terminal")
      .then((res) => res.json())
      .then((data: { cwd: string }) => setCwd(data.cwd))
      .catch(() => setCwd(null));
  }, [isHydrated, currentWorkspace]);

  const [repoName, setRepoName] = useState<string | null>(null);
  const [branch, setBranch] = useState<string | null>(null);
  const [remoteUrl, setRemoteUrl] = useState<string | null>(null);
  const [gitLog, setGitLog] = useState<string[]>([]);
  const [statusBuckets, setStatusBuckets] = useState<GitStatusBuckets>(EMPTY_BUCKETS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [commitMessage, setCommitMessage] = useState("");
  const [isCloneFormOpen, setIsCloneFormOpen] = useState(false);
  const [cloneUrl, setCloneUrl] = useState("");

  const runGit = useCallback(
    async (args: string): Promise<{ success: boolean; output: string }> => {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `git ${args}`, cwd }),
      });

      const data = (await res.json()) as TerminalApiResponse;

      return {
        success: data.success,
        output: data.success ? data.output ?? "" : data.error ?? "알 수 없는 오류",
      };
    },
    [cwd]
  );

  const refresh = useCallback(async () => {
    if (!cwd) return;

    setIsRefreshing(true);

    try {
      const [statusResult, branchResult, remoteResult, logResult] = await Promise.all([
        runGit("status --porcelain"),
        runGit("branch"),
        runGit("remote -v"),
        runGit("log --oneline -5"),
      ]);

      setStatusBuckets(
        parseGitStatus(statusResult.success ? statusResult.output : "")
      );
      setBranch(
        branchResult.success ? parseCurrentBranch(branchResult.output) : "(알 수 없음)"
      );

      const url = remoteResult.success ? parseRemoteUrl(remoteResult.output) : null;
      setRemoteUrl(url);
      setRepoName(deriveRepoName(url, cwd));

      const logLines = logResult.success
        ? logResult.output.split(/\r?\n/).filter((line) => line.trim())
        : [];
      setGitLog(logLines);
    } finally {
      setIsRefreshing(false);
    }
  }, [cwd, runGit]);

  useEffect(() => {
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  const handleAction = async (label: string, args: string) => {
    if (!cwd || busyAction) return;

    setBusyAction(label);

    try {
      const res = await runGit(args);
      setResult({ label, success: res.success, text: res.output });
      if (res.success) await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  const handleClone = async () => {
    const url = cloneUrl.trim();
    if (!url || !cwd || busyAction) return;

    await handleAction("Clone", `clone ${url} .`);
    setIsCloneFormOpen(false);
    setCloneUrl("");
  };

  const handleCommit = async () => {
    const message = commitMessage.trim();
    if (!message || !cwd || busyAction) return;

    setBusyAction("Commit");

    try {
      const addResult = await runGit("add -A");
      if (!addResult.success) {
        setResult({ label: "Commit", success: false, text: addResult.output });
        return;
      }

      const escaped = message.replace(/"/g, '`"');
      const commitResult = await runGit(`commit -m "${escaped}"`);
      setResult({ label: "Commit", success: commitResult.success, text: commitResult.output });

      if (commitResult.success) {
        setCommitMessage("");
        await refresh();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const statusSections: { label: string; files: string[] }[] = [
    { label: "Modified", files: statusBuckets.modified },
    { label: "Added", files: statusBuckets.added },
    { label: "Deleted", files: statusBuckets.deleted },
    { label: "Untracked", files: statusBuckets.untracked },
  ];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">🐙 GitHub Manager</h1>
        <p className="text-gray-400 mt-2">Local Git Management</p>
        {currentWorkspace && (
          <p className="text-sm text-blue-400 mt-1">
            Workspace: <span className="font-semibold">{currentWorkspace.name}</span>
          </p>
        )}
        <p className="font-mono text-sm text-green-400 mt-1">{cwd ?? "Loading..."}</p>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-xl mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Repository Info</h2>
          <button
            onClick={refresh}
            disabled={!cwd || isRefreshing}
            className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm transition-colors disabled:opacity-50"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="flex gap-2">
            <dt className="text-gray-500 w-32 shrink-0">Repository Name</dt>
            <dd className="font-mono break-all">{repoName ?? "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-32 shrink-0">Branch</dt>
            <dd className="font-mono">{branch ?? "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-32 shrink-0">Remote URL</dt>
            <dd className="font-mono break-all">{remoteUrl ?? "(원격 없음)"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-gray-500 w-32 shrink-0">Last Commit</dt>
            <dd className="font-mono break-all">{gitLog[0] ?? "(커밋 없음)"}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-xl mb-6">
        <h2 className="text-lg font-bold mb-4">Actions</h2>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setIsCloneFormOpen((prev) => !prev)}
            disabled={!cwd}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            Clone
          </button>
          <button
            onClick={() => handleAction("Pull", "pull")}
            disabled={!cwd || busyAction !== null}
            className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {busyAction === "Pull" ? "Pulling..." : "Pull"}
          </button>
          <button
            onClick={() => handleAction("Push", "push")}
            disabled={!cwd || busyAction !== null}
            className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {busyAction === "Push" ? "Pushing..." : "Push"}
          </button>
          <button
            onClick={() => handleAction("Fetch", "fetch")}
            disabled={!cwd || busyAction !== null}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors disabled:opacity-50"
          >
            {busyAction === "Fetch" ? "Fetching..." : "Fetch"}
          </button>
        </div>

        {isCloneFormOpen && (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 outline-none focus:border-green-500 font-mono text-sm"
            />
            <button
              onClick={handleClone}
              disabled={!cwd || busyAction !== null}
              className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {busyAction === "Clone" ? "Cloning..." : "Clone"}
            </button>
          </div>
        )}

        <div>
          <label htmlFor="commit-message" className="block text-sm text-gray-400 mb-1">
            Commit Message
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="commit-message"
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="변경 내용을 입력하세요"
              className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 outline-none focus:border-green-500"
            />
            <button
              onClick={handleCommit}
              disabled={!cwd || !commitMessage.trim() || busyAction !== null}
              className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {busyAction === "Commit" ? "Committing..." : "Commit"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-xl mb-6">
        <h2 className="text-lg font-bold mb-4">Git Status</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusSections.map((section) => (
            <div key={section.label}>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                {section.label} ({section.files.length})
              </h3>
              {section.files.length === 0 ? (
                <p className="text-sm text-gray-600">없음</p>
              ) : (
                <ul className="font-mono text-xs text-gray-300 space-y-1 break-all">
                  {section.files.map((file) => (
                    <li key={file}>{file}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5 shadow-xl mb-6">
        <h2 className="text-lg font-bold mb-4">Git Log (최근 5개)</h2>

        {gitLog.length === 0 ? (
          <p className="text-sm text-gray-600">커밋 기록이 없습니다.</p>
        ) : (
          <ul className="font-mono text-sm text-gray-300 space-y-1">
            {gitLog.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>

      {result && (
        <div className="rounded-xl border border-gray-700 bg-black p-5 shadow-xl">
          <h2 className="text-lg font-bold mb-2">
            {result.label} 결과
          </h2>
          <pre
            className={`font-mono text-sm whitespace-pre-wrap break-all ${
              result.success ? "text-green-400" : "text-red-500"
            }`}
          >
            {result.text || "(출력 없음)"}
          </pre>
        </div>
      )}
    </main>
  );
}
