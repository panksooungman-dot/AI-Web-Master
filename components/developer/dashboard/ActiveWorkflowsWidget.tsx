"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { WorkflowRun } from "@/lib/workflows/types";

const IN_FLIGHT = ["Pending", "Running", "Paused"];

export function ActiveWorkflowsWidget() {
  const [runs, setRuns] = useState<WorkflowRun[] | null>(null);

  useEffect(() => {
    fetch("/api/workflows/runs")
      .then((res) => res.json())
      .then((data: { runs: WorkflowRun[] }) => setRuns(data.runs ?? []))
      .catch(() => setRuns([]));
  }, []);

  const active = (runs ?? []).filter((r) => IN_FLIGHT.includes(r.status));

  return (
    <Card
      title="Active Workflows"
      actions={
        <Link href="/developer/workflows" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("ActiveWorkflowsWidget", "components/developer/dashboard/ActiveWorkflowsWidget.tsx")}
    >
      {runs === null ? (
        <LoadingText />
      ) : (
        <>
          <p className="mb-3 text-3xl font-bold">{active.length}</p>
          {active.length === 0 ? (
            <p className="text-sm text-gray-500">진행 중인 Workflow가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-gray-400">
              {active.slice(0, 3).map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  <Badge tone="info">{r.status}</Badge>
                  <span className="truncate">{r.workflowId}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
