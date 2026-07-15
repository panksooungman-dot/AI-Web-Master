"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { StatusMessage } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import {
  fetchDevServerStatus,
  restartDevServer,
  startDevServer,
  stopDevServer,
  type DevServerRunStatus,
} from "@/lib/devserver/client";
import { useResolvedCwd } from "@/lib/hooks/useResolvedCwd";
import { fetchGitStatus, type ProjectGitStatus } from "@/lib/projects/status";

interface ResultMessage {
  success: boolean;
  text: string;
}

const STATUS_LABEL: Record<DevServerRunStatus, string> = {
  starting: "Starting",
  running: "Running",
  stopped: "Stopped",
  error: "Error",
};

const STATUS_TONE: Record<DevServerRunStatus, BadgeTone> = {
  starting: "warning",
  running: "success",
  stopped: "neutral",
  error: "danger",
};

const PORT_POLL_INTERVAL_MS = 2000;
const PORT_POLL_TIMEOUT_MS = 30000;
// Start/Restart 직후의 pollUntilPortKnownOrSettled()는 그 순간에만 도는
// 임시 폴링이라, 이후 실제 dev 서버 프로세스가 (터미널 종료 등으로) 외부에서
// 죽으면 이 카드는 새로고침 전까지 죽은 PID를 계속 Running으로 표시했다.
// 마운트되어 있는 동안 주기적으로 상태를 재조회해 자연 종료도 반영되게 한다.
const STATUS_REFRESH_INTERVAL_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function DevServerManagerCard() {
  const { cwd } = useResolvedCwd();

  const [status, setStatus] = useState<DevServerRunStatus>("stopped");
  const [port, setPort] = useState<number | null>(null);
  const [pid, setPid] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [result, setResult] = useState<ResultMessage | null>(null);
  const [gitStatus, setGitStatus] = useState<ProjectGitStatus | null>(null);

  const isBusy = isStarting || isStopping || isRestarting;

  const refreshStatus = useCallback(async () => {
    if (!cwd) return null;

    const data = await fetchDevServerStatus(cwd);
    setStatus(data.status);
    setPid(data.pid);
    setPort(data.port);

    if (data.status === "error") {
      setResult({ success: false, text: data.error ?? "개발 서버 실행 중 오류가 발생했습니다." });
    }

    return data;
  }, [cwd]);

  useEffect(() => {
    queueMicrotask(() => {
      refreshStatus();
    });
  }, [refreshStatus]);

  useEffect(() => {
    if (!cwd) return;

    const interval = setInterval(() => {
      if (isBusy) return;
      refreshStatus();
    }, STATUS_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cwd, isBusy, refreshStatus]);

  useEffect(() => {
    if (!cwd) return;

    queueMicrotask(async () => {
      const data = await fetchGitStatus(cwd);
      setGitStatus(data);
    });
  }, [cwd]);

  const pollUntilPortKnownOrSettled = useCallback(async () => {
    const deadline = Date.now() + PORT_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      const data = await refreshStatus();
      if (!data) return;
      if (data.port !== null) return;
      if (data.status !== "starting" && data.status !== "running") return;
      await sleep(PORT_POLL_INTERVAL_MS);
    }
  }, [refreshStatus]);

  const handleStart = async () => {
    if (!cwd || isBusy) return;

    setIsStarting(true);
    setResult(null);

    try {
      const response = await startDevServer(cwd);

      if (response.success) {
        setResult({ success: true, text: "개발 서버 실행에 성공했습니다." });
        await pollUntilPortKnownOrSettled();
      } else {
        setResult({ success: false, text: response.error ?? "개발 서버 실행에 실패했습니다." });
        await refreshStatus();
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    if (!cwd || isBusy) return;

    setIsStopping(true);
    setResult(null);

    try {
      const response = await stopDevServer(cwd);

      setResult(
        response.success
          ? { success: true, text: "개발 서버를 중지했습니다." }
          : { success: false, text: response.error ?? "개발 서버 중지에 실패했습니다." }
      );

      await refreshStatus();
    } finally {
      setIsStopping(false);
    }
  };

  const handleRestart = async () => {
    if (!cwd || isBusy) return;

    setIsRestarting(true);
    setResult(null);

    try {
      const response = await restartDevServer(cwd);

      if (response.success) {
        setResult({ success: true, text: "개발 서버를 재시작했습니다." });
        await pollUntilPortKnownOrSettled();
      } else {
        setResult({ success: false, text: response.error ?? "개발 서버 재시작에 실패했습니다." });
        await refreshStatus();
      }
    } finally {
      setIsRestarting(false);
    }
  };

  const isTransitioning = status === "starting" || status === "running";
  const url = status === "running" && port !== null ? `http://localhost:${port}` : null;

  return (
    <Card
      title="🖥️ Development Server"
      actions={<Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>}
      {...componentMarker("DevServerManagerCard", "components/developer/DevServerManagerCard.tsx")}
    >
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-4">
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20 shrink-0">Status</dt>
          <dd className="font-mono">{STATUS_LABEL[status]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20 shrink-0">Port</dt>
          <dd className="font-mono">{port ?? "-"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20 shrink-0">PID</dt>
          <dd className="font-mono">{pid ?? "-"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20 shrink-0">URL</dt>
          <dd className="font-mono truncate">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                {url}
              </a>
            ) : (
              "-"
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20 shrink-0">Branch</dt>
          <dd className="font-mono">{gitStatus?.hasRepo ? gitStatus.branch ?? "-" : "-"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 w-20 shrink-0">Git 변경 수</dt>
          <dd className="font-mono">{gitStatus?.hasRepo ? gitStatus.dirtyCount : "-"}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={handleStart}
          disabled={isTransitioning || isBusy || !cwd}
          className="rounded bg-green-600 hover:bg-green-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
        >
          {isStarting ? "Starting..." : "▶ Start"}
        </button>
        <button
          onClick={handleStop}
          disabled={status === "stopped" || isBusy || !cwd}
          className="rounded bg-red-600/80 hover:bg-red-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
        >
          {isStopping ? "Stopping..." : "■ Stop"}
        </button>
        <button
          onClick={handleRestart}
          disabled={status === "stopped" || isBusy || !cwd}
          className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm transition-colors disabled:opacity-50"
        >
          {isRestarting ? "Restarting..." : "↻ Restart"}
        </button>
      </div>

      {result && (
        <StatusMessage tone={result.success ? "success" : "error"}>{result.text}</StatusMessage>
      )}
    </Card>
  );
}
