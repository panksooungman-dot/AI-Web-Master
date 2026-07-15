"use client";

import { useEffect, useState } from "react";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";

interface AgentTask {
  id: string;
  agentId: string;
  prompt: string;
  status: "Queued" | "Running" | "Success" | "Failed" | "Cancelled";
  progress: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  result: { success: boolean; output: string; error?: string } | null;
}

const STATUS_TONES: Record<AgentTask["status"], BadgeTone> = {
  Queued: "neutral",
  Running: "info",
  Success: "success",
  Failed: "danger",
  Cancelled: "warning",
};

export default function AiTasksPage() {
  const [tasks, setTasks] = useState<AgentTask[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadTasks = () => {
    fetch("/api/agents/tasks")
      .then((res) => res.json())
      .then((data: { tasks: AgentTask[] }) => setTasks(data.tasks ?? []))
      .catch(() => setError("Task 목록을 불러오지 못했습니다."));
  };

  useEffect(() => {
    queueMicrotask(loadTasks);
    const interval = setInterval(loadTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCancel = async (id: string) => {
    setPendingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/agents/tasks/${id}/cancel`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) {
        setActionError(data.error ?? "취소 실패");
        return;
      }
      loadTasks();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setPendingId(null);
    }
  };

  const handleRetry = async (id: string) => {
    setPendingId(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/agents/tasks/${id}/retry`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!data.success) {
        setActionError(data.error ?? "재시도 실패");
        return;
      }
      loadTasks();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div {...componentMarker("AiTasksPage", "app/developer/ai/tasks/page.tsx")}>
      <PageHeader
        icon="🗂️"
        title="AI Task History"
        description="Dashboard의 AI Task Queue 전체 이력 — Cancel/Retry를 실행할 수 있습니다."
      />

      {actionError && <StatusMessage tone="error">{actionError}</StatusMessage>}

      <Card title="Tasks">
        {tasks === null ? (
          <LoadingText />
        ) : error ? (
          <StatusMessage tone="error">{error}</StatusMessage>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-gray-500">아직 실행된 Task가 없습니다.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <li key={task.id} className="rounded border border-gray-800 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-200 truncate">
                      [{task.agentId}] {task.prompt}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(task.createdAt).toLocaleString()}
                      {task.result?.error ? ` — ${task.result.error}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={STATUS_TONES[task.status]}>{task.status}</Badge>
                    {(task.status === "Queued" || task.status === "Running") && (
                      <button
                        onClick={() => handleCancel(task.id)}
                        disabled={pendingId === task.id}
                        className="rounded bg-red-700 hover:bg-red-600 px-2 py-1 text-xs transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    )}
                    {task.status === "Failed" && (
                      <button
                        onClick={() => handleRetry(task.id)}
                        disabled={pendingId === task.id}
                        className="rounded bg-blue-700 hover:bg-blue-600 px-2 py-1 text-xs transition-colors disabled:opacity-50"
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
      </Card>
    </div>
  );
}
