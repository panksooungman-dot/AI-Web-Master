"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { MetricsSummary } from "@/lib/metrics/registry";

export default function MetricsPage() {
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setLoadError(null);
    fetch("/api/metrics")
      .then((res) => res.json())
      .then((json: MetricsSummary) => setSummary(json))
      .catch(() => setLoadError("Metrics를 불러오지 못했습니다."));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="📈"
        title="Metrics"
        description="Build·Website 생성·AI Task·Marketplace 설치 누적 횟수와 Provider 사용량을 표시합니다."
        actions={
          <button
            onClick={load}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        }
      />

      {loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : summary === null ? (
        <LoadingText />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card title="Build Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.buildCount}</p>
          </Card>
          <Card title="Website Generation Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.websiteGenerationCount}</p>
          </Card>
          <Card title="AI Task Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.aiTaskCount}</p>
          </Card>
          <Card title="Marketplace Installs">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.marketplaceInstallCount}</p>
          </Card>
          <Card title="Storyboard Generation Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.storyboardGenerationCount}</p>
          </Card>
          <Card title="Wireframe Generation Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.wireframeGenerationCount}</p>
          </Card>
          <Card title="Prototype Generation Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.prototypeGenerationCount}</p>
          </Card>
          <Card title="Claude Design Generation Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.claudeDesignGenerationCount}</p>
          </Card>
          <Card title="Review Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.reviewCount}</p>
          </Card>
          <Card title="Approval Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.approvalCount}</p>
          </Card>
          <Card title="Revision Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.revisionCount}</p>
          </Card>
          <Card title="Figma Import Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.figmaImportCount}</p>
          </Card>
          <Card title="Figma Export Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.figmaExportCount}</p>
          </Card>
          <Card title="Design Sync Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.designSyncCount}</p>
          </Card>
          <Card title="Conflict Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.conflictCount}</p>
          </Card>
          <Card title="Rollback Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.rollbackCount}</p>
          </Card>
          <Card title="Design Website Build Count">
            <p className="text-3xl font-bold text-gray-100">{summary.counters.designWebsiteBuildCount}</p>
          </Card>

          <Card title="Provider Usage" className="sm:col-span-2 lg:col-span-2">
            {summary.providerUsage ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Total Calls</span>
                  <span className="text-gray-200">{summary.providerUsage.totalCalls}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Input Tokens</span>
                  <span className="text-gray-200">{summary.providerUsage.totalInputTokens.toLocaleString()}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Output Tokens</span>
                  <span className="text-gray-200">{summary.providerUsage.totalOutputTokens.toLocaleString()}</span>
                </li>
                {Object.entries(summary.providerUsage.byProvider).map(([provider, stats]) => (
                  <li key={provider} className="flex items-center justify-between gap-3 pl-3 border-l border-gray-800">
                    <span className="text-gray-500">{provider}</span>
                    <span className="text-xs text-gray-400">
                      {stats.calls}회 · {stats.inputTokens.toLocaleString()} in / {stats.outputTokens.toLocaleString()} out
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">사용 이력이 없습니다.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
