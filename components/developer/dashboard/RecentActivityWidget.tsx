"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";

interface LogItem {
  id: string;
  timestamp: string;
  category: string;
  message: string;
  status: "Success" | "Error" | "Info" | "Warning";
}

const STATUS_TONES: Record<LogItem["status"], BadgeTone> = {
  Success: "success",
  Error: "danger",
  Info: "info",
  Warning: "warning",
};

export function RecentActivityWidget() {
  const [logs, setLogs] = useState<LogItem[] | null>(null);

  useEffect(() => {
    fetch("/api/logs")
      .then((res) => res.json())
      .then((data: { logs: LogItem[] }) => setLogs((data.logs ?? []).slice(0, 5)))
      .catch(() => setLogs([]));
  }, []);

  return (
    <Card
      title="Recent Activity"
      actions={
        <Link href="/developer/logs" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("RecentActivityWidget", "components/developer/dashboard/RecentActivityWidget.tsx")}
    >
      {logs === null ? (
        <LoadingText />
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500">최근 활동이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {logs.map((log) => (
            <li key={log.id} className="flex items-center gap-2">
              <Badge tone={STATUS_TONES[log.status]} className="shrink-0">
                {log.category}
              </Badge>
              <span className="truncate text-gray-400">{log.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
