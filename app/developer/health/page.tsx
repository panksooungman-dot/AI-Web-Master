"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { CheckResult, DiskUsageResult, GitStatusResult, HealthCache, HealthCheckId } from "@/lib/health/checks";

interface HealthResponse {
  git: GitStatusResult;
  disk: DiskUsageResult;
  cache: HealthCache;
}

const RUNNABLE_CHECKS: { id: HealthCheckId; label: string }[] = [
  { id: "build", label: "Build Status" },
  { id: "test", label: "Tests" },
  { id: "coverage", label: "Coverage" },
];

function formatGB(bytes: number): string {
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function CheckCard({
  label,
  result,
  onRun,
  isRunning,
}: {
  label: string;
  result?: CheckResult;
  onRun: () => void;
  isRunning: boolean;
}) {
  return (
    <Card
      title={label}
      actions={result && <Badge tone={result.success ? "success" : "danger"}>{result.success ? "Pass" : "Fail"}</Badge>}
    >
      {result ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">마지막 실행</span>
            <span className="text-xs text-gray-400">{new Date(result.ranAt).toLocaleString()}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">소요 시간</span>
            <span className="text-xs text-gray-400">{(result.durationMs / 1000).toFixed(1)}s</span>
          </li>
          {typeof result.coveragePct === "number" && (
            <li className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Line Coverage</span>
              <span className="text-xs text-gray-400">{result.coveragePct.toFixed(1)}%</span>
            </li>
          )}
          {!result.success && <p className="text-xs text-red-400 break-all">{result.summary}</p>}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">아직 실행되지 않았습니다.</p>
      )}
      <button
        onClick={onRun}
        disabled={isRunning}
        className="mt-3 rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
      >
        {isRunning ? "실행 중... (최대 1분)" : "Run Now"}
      </button>
    </Card>
  );
}

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [runningCheck, setRunningCheck] = useState<HealthCheckId | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((json: HealthResponse) => setData(json))
      .catch(() => setLoadError("Health 정보를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleRun = async (check: HealthCheckId) => {
    if (runningCheck) return;

    setRunningCheck(check);
    setRunError(null);

    try {
      const res = await fetch("/api/health/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ check }),
      });
      const json = (await res.json()) as { success: boolean; result?: CheckResult; error?: string };

      if (!json.success || !json.result) {
        setRunError(json.error ?? "실행 실패");
        return;
      }

      setData((prev) => (prev ? { ...prev, cache: { ...prev.cache, [check]: json.result! } } : prev));
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setRunningCheck(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon="🩺"
        title="Health"
        description="Build·Test·Coverage는 수동 실행, Git Status·Disk Usage는 실시간으로 표시합니다."
      />

      {runError && <StatusMessage tone="error" className="mb-4">{runError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError || !data ? (
        <StatusMessage tone="error">{loadError ?? "데이터 없음"}</StatusMessage>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {RUNNABLE_CHECKS.map((check) => (
            <CheckCard
              key={check.id}
              label={check.label}
              result={data.cache[check.id]}
              onRun={() => handleRun(check.id)}
              isRunning={runningCheck === check.id}
            />
          ))}

          <Card
            title="Git Status"
            actions={<Badge tone={data.git.clean ? "success" : "warning"}>{data.git.clean ? "Clean" : "Dirty"}</Badge>}
          >
            <ul className="flex flex-col gap-1.5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Branch</span>
                <span className="font-mono text-xs text-gray-300">{data.git.branch ?? "-"}</span>
              </li>
            </ul>
          </Card>

          <Card title="Disk Usage">
            <ul className="flex flex-col gap-1.5 text-sm">
              <li className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Total</span>
                <span className="text-gray-300">{formatGB(data.disk.totalBytes)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Used</span>
                <span className="text-gray-300">{formatGB(data.disk.usedBytes)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Free</span>
                <span className="text-gray-300">{formatGB(data.disk.freeBytes)}</span>
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
