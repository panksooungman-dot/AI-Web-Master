"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { UsageSummary } from "@/lib/ai/bridge";

export function TokenUsageWidget() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);

  useEffect(() => {
    fetch("/api/ai/usage")
      .then((res) => res.json())
      .then((json: { summary?: UsageSummary }) =>
        setSummary(json.summary ?? { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, byProvider: {} })
      )
      .catch(() => setSummary({ totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, byProvider: {} }));
  }, []);

  return (
    <Card
      title="Token Usage"
      actions={
        <Link href="/developer/ai" className="text-xs text-blue-400 hover:underline">
          AI Workspace →
        </Link>
      }
      {...componentMarker("TokenUsageWidget", "components/developer/dashboard/TokenUsageWidget.tsx")}
    >
      {summary === null ? (
        <LoadingText />
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Total Calls</span>
            <span className="text-gray-200">{summary.totalCalls}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Input Tokens</span>
            <span className="text-gray-200">{summary.totalInputTokens.toLocaleString()}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Output Tokens</span>
            <span className="text-gray-200">{summary.totalOutputTokens.toLocaleString()}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}
