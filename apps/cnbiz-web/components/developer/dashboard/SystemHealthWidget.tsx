"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { DiskUsageResult, GitStatusResult, HealthCache } from "@/lib/health/checks";

export function SystemHealthWidget() {
  const [data, setData] = useState<{ git: GitStatusResult; disk: DiskUsageResult; cache: HealthCache } | null>(
    null
  );

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((json: { git: GitStatusResult; disk: DiskUsageResult; cache: HealthCache }) => setData(json))
      .catch(() => setData(null));
  }, []);

  return (
    <Card
      title="System Health"
      actions={
        <Link href="/developer/health" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("SystemHealthWidget", "components/developer/dashboard/SystemHealthWidget.tsx")}
    >
      {data === null ? (
        <LoadingText />
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Git</span>
            <Badge tone={data.git.clean ? "success" : "warning"}>
              {data.git.clean ? "Clean" : "Dirty"} ({data.git.branch ?? "-"})
            </Badge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Build</span>
            <Badge tone={data.cache.build ? (data.cache.build.success ? "success" : "danger") : "neutral"}>
              {data.cache.build ? (data.cache.build.success ? "Pass" : "Fail") : "미실행"}
            </Badge>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Tests</span>
            <Badge tone={data.cache.test ? (data.cache.test.success ? "success" : "danger") : "neutral"}>
              {data.cache.test ? (data.cache.test.success ? "Pass" : "Fail") : "미실행"}
            </Badge>
          </li>
        </ul>
      )}
    </Card>
  );
}
