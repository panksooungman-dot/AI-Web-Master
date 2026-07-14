"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { MetricsCounters } from "@/lib/metrics/registry";

export function MetricsWidget() {
  const [counters, setCounters] = useState<MetricsCounters | null>(null);

  useEffect(() => {
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((json: { counters: MetricsCounters }) => setCounters(json.counters))
      .catch(() =>
        setCounters({
          buildCount: 0,
          websiteGenerationCount: 0,
          aiTaskCount: 0,
          marketplaceInstallCount: 0,
          storyboardGenerationCount: 0,
          wireframeGenerationCount: 0,
        })
      );
  }, []);

  return (
    <Card
      title="Metrics"
      actions={
        <Link href="/developer/metrics" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("MetricsWidget", "components/developer/dashboard/MetricsWidget.tsx")}
    >
      {counters === null ? (
        <LoadingText />
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Builds</span>
            <span className="text-gray-200">{counters.buildCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Websites Generated</span>
            <span className="text-gray-200">{counters.websiteGenerationCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">AI Tasks</span>
            <span className="text-gray-200">{counters.aiTaskCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Marketplace Installs</span>
            <span className="text-gray-200">{counters.marketplaceInstallCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Storyboards Generated</span>
            <span className="text-gray-200">{counters.storyboardGenerationCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Wireframes Generated</span>
            <span className="text-gray-200">{counters.wireframeGenerationCount}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}
