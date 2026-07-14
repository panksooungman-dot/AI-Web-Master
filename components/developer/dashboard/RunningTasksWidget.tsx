"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";

interface AgentTask {
  id: string;
  agentId: string;
  prompt: string;
  status: string;
}

export function RunningTasksWidget() {
  const [tasks, setTasks] = useState<AgentTask[] | null>(null);

  useEffect(() => {
    fetch("/api/agents/tasks")
      .then((res) => res.json())
      .then((data: { tasks: AgentTask[] }) => setTasks(data.tasks ?? []))
      .catch(() => setTasks([]));
  }, []);

  const running = (tasks ?? []).filter((t) => t.status === "Running");

  return (
    <Card
      title="Running AI Tasks"
      actions={<Badge tone={running.length > 0 ? "info" : "neutral"}>{running.length}</Badge>}
      {...componentMarker("RunningTasksWidget", "components/developer/dashboard/RunningTasksWidget.tsx")}
    >
      {tasks === null ? (
        <LoadingText />
      ) : running.length === 0 ? (
        <p className="text-sm text-gray-500">실행 중인 Task가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm text-gray-400">
          {running.slice(0, 3).map((t) => (
            <li key={t.id} className="truncate">
              [{t.agentId}] {t.prompt}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
