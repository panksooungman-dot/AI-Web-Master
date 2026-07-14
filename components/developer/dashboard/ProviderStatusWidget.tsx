"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { ProviderSummary } from "@/lib/ai/bridge";
import type { ProviderStatus } from "@/lib/providers/status";

export function ProviderStatusWidget() {
  const [dashboardProviders, setDashboardProviders] = useState<ProviderStatus[] | null>(null);
  const [cliProviders, setCliProviders] = useState<ProviderSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((res) => res.json())
      .then((json: { providers: ProviderStatus[] }) => setDashboardProviders(json.providers ?? []))
      .catch(() => setDashboardProviders([]));

    fetch("/api/ai/providers")
      .then((res) => res.json())
      .then((json: { providers: ProviderSummary[] }) => setCliProviders(json.providers ?? []))
      .catch(() => setCliProviders([]));
  }, []);

  const isLoading = dashboardProviders === null || cliProviders === null;
  const connectedCount = (dashboardProviders ?? []).filter(
    (p) => p.status === "Connected" || p.status === "Configured" || p.status === "Installed"
  ).length;
  const defaultProvider = (cliProviders ?? []).find((p) => p.isDefault);

  return (
    <Card
      title="Provider Status"
      actions={
        <Link href="/developer/ai" className="text-xs text-blue-400 hover:underline">
          AI Workspace →
        </Link>
      }
      {...componentMarker("ProviderStatusWidget", "components/developer/dashboard/ProviderStatusWidget.tsx")}
    >
      {isLoading ? (
        <LoadingText />
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Connected</span>
            <span className="text-gray-200">
              {connectedCount} / {(dashboardProviders ?? []).length}
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Default Provider</span>
            <span className="font-mono text-xs text-gray-200">{defaultProvider?.id ?? "-"}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}
