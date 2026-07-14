"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { CatalogSummary, InstalledPackage } from "@/lib/marketplace/registry";

interface MarketplaceResponse {
  catalog: CatalogSummary;
  installed: InstalledPackage[];
}

export default function MarketplacePage() {
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [installed, setInstalled] = useState<InstalledPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyName, setBusyName] = useState<string | null>(null);
  const [installName, setInstallName] = useState("");

  const load = () => {
    fetch("/api/marketplace")
      .then((res) => res.json())
      .then((data: MarketplaceResponse) => {
        setCatalog(data.catalog);
        setInstalled(data.installed ?? []);
      })
      .catch(() => setLoadError("Marketplace 정보를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleInstall = async (name: string) => {
    if (!name.trim() || busyName) return;

    setBusyName(name);
    setActionError(null);

    try {
      const res = await fetch(`/api/marketplace/${encodeURIComponent(name.trim())}`, { method: "POST" });
      const data = (await res.json()) as { success: boolean; installed: InstalledPackage[] };

      if (data.success) {
        setInstalled(data.installed);
        setInstallName("");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusyName(null);
    }
  };

  const handleRemove = async (name: string) => {
    if (busyName) return;

    setBusyName(name);
    setActionError(null);

    try {
      const res = await fetch(`/api/marketplace/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = (await res.json()) as { success: boolean; installed: InstalledPackage[] };

      if (data.success) setInstalled(data.installed);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusyName(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon="🧩"
        title="Marketplace"
        description="Agents·Prompts·Skills·Templates·Workflows 패키지의 설치 상태를 관리합니다."
      />

      {actionError && <StatusMessage tone="error" className="mb-4">{actionError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Available Packages">
            {!catalog || catalog.totalAvailable === 0 ? (
              <p className="text-sm text-gray-500">
                아직 게시된 패키지가 없습니다 (모든 카테고리 count: 0). `ai publish`로 첫 패키지를 게시하면
                여기에 표시됩니다.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-sm">
                {catalog.categories.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <span className="text-gray-300">{c.id}</span>
                    <Badge tone={c.count > 0 ? "accent" : "neutral"}>{c.count}개</Badge>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={installName}
                onChange={(e) => setInstallName(e.target.value)}
                placeholder="설치 추적할 패키지 이름"
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
              <button
                onClick={() => handleInstall(installName)}
                disabled={!installName.trim() || busyName !== null}
                className="rounded bg-green-600 hover:bg-green-700 px-3 py-2 text-sm transition-colors disabled:opacity-50"
              >
                Install
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Update Available: N/A — 실제 게시된 패키지가 없어 버전 비교가 불가능합니다.
            </p>
          </Card>

          <Card title="Installed Packages">
            {installed.length === 0 ? (
              <p className="text-sm text-gray-500">설치된(추적 중인) 패키지가 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {installed.map((pkg) => (
                  <li
                    key={pkg.name}
                    className="flex items-center justify-between gap-3 rounded border border-gray-800 p-2 text-sm"
                  >
                    <div>
                      <p className="text-gray-200">{pkg.name}</p>
                      <p className="text-xs text-gray-600">{new Date(pkg.installedAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleRemove(pkg.name)}
                      disabled={busyName === pkg.name}
                      className="rounded bg-red-900/60 hover:bg-red-800 px-3 py-1 text-xs text-red-200 transition-colors disabled:opacity-50"
                    >
                      {busyName === pkg.name ? "Removing..." : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
