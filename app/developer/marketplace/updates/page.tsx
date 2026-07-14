"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { MarketplaceTabs } from "@/components/developer/marketplace/MarketplaceTabs";
import type { InstalledPackageInfo } from "@/lib/marketplace/registry";

export default function MarketplaceUpdatesPage() {
  const [outdated, setOutdated] = useState<InstalledPackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isUpdatingAll, setIsUpdatingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/marketplace/installed")
      .then((res) => res.json())
      .then((data: { success: boolean; installed: InstalledPackageInfo[]; error?: string }) => {
        if (!data.success) {
          setLoadError(data.error ?? "업데이트 정보를 불러오지 못했습니다.");
          return;
        }
        setOutdated((data.installed ?? []).filter((pkg) => pkg.updateAvailable));
      })
      .catch(() => setLoadError("업데이트 정보를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleUpdate = async (pkg: InstalledPackageInfo) => {
    const key = `${pkg.type}/${pkg.name}`;
    if (busyKey || isUpdatingAll) return;

    setBusyKey(key);
    setActionError(null);

    try {
      const res = await fetch(`/api/marketplace/${pkg.type}/${encodeURIComponent(pkg.name)}`, {
        method: "PATCH",
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!data.success) {
        setActionError(data.error ?? "업데이트 실패");
        return;
      }

      setOutdated((prev) => prev.filter((p) => !(p.type === pkg.type && p.name === pkg.name)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdateAll = async () => {
    if (busyKey || isUpdatingAll || outdated.length === 0) return;

    setIsUpdatingAll(true);
    setActionError(null);

    try {
      for (const pkg of outdated) {
        const res = await fetch(`/api/marketplace/${pkg.type}/${encodeURIComponent(pkg.name)}`, {
          method: "PATCH",
        });
        const data = (await res.json()) as { success: boolean; error?: string };
        if (!data.success) {
          setActionError(`${pkg.name}: ${data.error ?? "업데이트 실패"}`);
        }
      }
      load();
    } finally {
      setIsUpdatingAll(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon="🧩"
        title="Marketplace"
        description="업데이트가 가능한 설치된 패키지 목록입니다."
        actions={
          outdated.length > 0 && (
            <button
              onClick={handleUpdateAll}
              disabled={isUpdatingAll}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {isUpdatingAll ? "Updating..." : `Update All (${outdated.length})`}
            </button>
          )
        }
      />

      <MarketplaceTabs />

      {actionError && <StatusMessage tone="error" className="mb-4">{actionError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : outdated.length === 0 ? (
        <p className="text-sm text-gray-500">모든 패키지가 최신 상태입니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {outdated.map((pkg) => {
            const key = `${pkg.type}/${pkg.name}`;

            return (
              <Card key={key} className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Badge tone="accent" className="w-20 shrink-0 text-center">
                  {pkg.type}
                </Badge>

                <div className="flex-1">
                  <Link
                    href={`/developer/marketplace/${pkg.type}/${encodeURIComponent(pkg.name)}`}
                    className="font-semibold text-gray-200 hover:underline"
                  >
                    {pkg.name}
                  </Link>
                  <p className="text-xs text-gray-500">{pkg.description}</p>
                </div>

                <Badge tone="warning">
                  v{pkg.installedVersion} → v{pkg.latestVersion}
                </Badge>

                <button
                  onClick={() => handleUpdate(pkg)}
                  disabled={busyKey === key || isUpdatingAll}
                  className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs transition-colors disabled:opacity-50"
                >
                  {busyKey === key ? "..." : "Update"}
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
