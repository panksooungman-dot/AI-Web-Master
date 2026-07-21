"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { useResolvedCwd } from "@/lib/hooks/useResolvedCwd";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import type { Workflow, WorkflowRun, WorkflowRunStatus } from "@/lib/workflows/types";

const RUN_STATUS_TONES: Record<WorkflowRunStatus, BadgeTone> = {
  Pending: "neutral",
  Running: "info",
  Paused: "warning",
  Completed: "success",
  Failed: "danger",
  Cancelled: "neutral",
};

const IN_FLIGHT: WorkflowRunStatus[] = ["Pending", "Running", "Paused"];

export default function WorkflowCenterPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);

  const { cwd } = useResolvedCwd();
  const { currentWorkspace } = useWorkspaceStore();

  const load = () => {
    Promise.all([
      fetch("/api/workflows").then((res) => res.json()),
      fetch("/api/workflows/runs").then((res) => res.json()),
    ])
      .then(([workflowsData, runsData]: [{ workflows: Workflow[] }, { runs: WorkflowRun[] }]) => {
        setWorkflows(workflowsData.workflows ?? []);
        setRuns(runsData.runs ?? []);
        setLoadError(null);
      })
      .catch(() => setLoadError("Workflow 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  // Poll while any run is still in flight.
  useEffect(() => {
    if (!runs.some((run) => IN_FLIGHT.includes(run.status))) return;

    const interval = setInterval(load, 1500);
    return () => clearInterval(interval);
  }, [runs]);

  const runsFor = (workflowId: string) =>
    runs
      .filter((run) => run.workflowId === workflowId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleRun = async (workflow: Workflow) => {
    if (!cwd || runningWorkflowId) return;

    setRunningWorkflowId(workflow.id);
    setActionError(null);

    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cwd,
          workspaceId: currentWorkspace?.id,
          workspaceName: currentWorkspace?.name,
        }),
      });

      const data = (await res.json()) as { success: boolean; run?: WorkflowRun; error?: string };

      if (!data.success || !data.run) {
        setActionError(data.error ?? "Workflow 실행 실패");
        return;
      }

      setRuns((prev) => [data.run as WorkflowRun, ...prev]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setRunningWorkflowId(null);
    }
  };

  const handleRunAction = async (run: WorkflowRun, action: "pause" | "resume" | "cancel" | "retry") => {
    setActionError(null);

    try {
      const res = await fetch(`/api/workflows/runs/${run.id}/${action}`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; run?: WorkflowRun; error?: string };

      if (!data.success) {
        setActionError(data.error ?? `${action} 실패`);
        return;
      }

      if (data.run) {
        setRuns((prev) => prev.map((r) => (r.id === data.run!.id ? (data.run as WorkflowRun) : r)));
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    }
  };

  return (
    <div>
      <PageHeader
        icon="⚙"
        title="Workflow Center"
        description="등록된 Workflow를 실행하고 진행 상황·이력을 확인합니다."
        actions={
          <Link href="/developer/planning" className="text-xs text-blue-400 hover:underline self-center">
            기획 현황 →
          </Link>
        }
      />

      {actionError && <StatusMessage tone="error" className="mb-4">{actionError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : workflows.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 Workflow가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {workflows.map((workflow) => {
            const workflowRuns = runsFor(workflow.id);
            const latestRun = workflowRuns[0];

            return (
              <Card
                key={workflow.id}
                title={workflow.name}
                actions={
                  <button
                    onClick={() => handleRun(workflow)}
                    disabled={!cwd || runningWorkflowId === workflow.id}
                    className="rounded bg-green-600 hover:bg-green-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
                  >
                    {runningWorkflowId === workflow.id ? "실행 중..." : "Run"}
                  </button>
                }
              >
                <p className="mb-3 text-sm text-gray-400">{workflow.description || "설명 없음"}</p>
                <p className="mb-3 text-xs text-gray-600">{workflow.steps.length}개 단계</p>

                {workflowRuns.length === 0 ? (
                  <p className="text-xs text-gray-600">실행 이력이 없습니다.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {workflowRuns.map((run) => (
                      <li key={run.id} className="rounded border border-gray-800 p-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone={RUN_STATUS_TONES[run.status]}>{run.status}</Badge>
                            <span className="text-xs text-gray-500">
                              {run.currentStepIndex + 1}/{run.steps.length} 단계 ·{" "}
                              {new Date(run.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            {run.status === "Running" && (
                              <button
                                onClick={() => handleRunAction(run, "pause")}
                                className="rounded bg-gray-700 hover:bg-gray-600 px-2 py-1 text-xs transition-colors"
                              >
                                Pause
                              </button>
                            )}
                            {run.status === "Paused" && (
                              <button
                                onClick={() => handleRunAction(run, "resume")}
                                className="rounded bg-blue-600 hover:bg-blue-700 px-2 py-1 text-xs transition-colors"
                              >
                                Resume
                              </button>
                            )}
                            {IN_FLIGHT.includes(run.status) && (
                              <button
                                onClick={() => handleRunAction(run, "cancel")}
                                className="rounded bg-red-900/60 hover:bg-red-800 px-2 py-1 text-xs text-red-200 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            {run.status === "Failed" && (
                              <button
                                onClick={() => handleRunAction(run, "retry")}
                                className="rounded bg-yellow-600 hover:bg-yellow-700 px-2 py-1 text-xs transition-colors"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {latestRun && <p className="mt-2 text-xs text-gray-600">최근 실행: {latestRun.status}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
