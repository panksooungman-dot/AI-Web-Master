"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { MarketplaceTabs } from "@/components/developer/marketplace/MarketplaceTabs";
import type { InstalledPackageInfo } from "@/lib/marketplace/registry";

export default function MarketplaceInstalledPage() {
  const [installed, setInstalled] = useState<InstalledPackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/marketplace/installed")
      .then((res) => res.json())
      .then((data: { success: boolean; installed: InstalledPackageInfo[]; error?: string }) => {
        if (!data.success) {
          setLoadError(data.error ?? "설치된 패키지를 불러오지 못했습니다.");
          return;
        }
        setInstalled(data.installed ?? []);
      })
      .catch(() => setLoadError("설치된 패키지를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const handleRemove = async (pkg: InstalledPackageInfo) => {
    const key = `${pkg.type}/${pkg.name}`;
    if (busyKey) return;

    setBusyKey(key);
    setActionError(null);

    try {
      const res = await fetch(`/api/marketplace/${pkg.type}/${encodeURIComponent(pkg.name)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!data.success) {
        setActionError(data.error ?? "제거 실패");
        return;
      }

      setInstalled((prev) => prev.filter((p) => !(p.type === pkg.type && p.name === pkg.name)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusyKey(null);
    }
  };

  const handleUpdate = async (pkg: InstalledPackageInfo) => {
    const key = `${pkg.type}/${pkg.name}`;
    if (busyKey) return;

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

      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <PageHeader icon="🧩" title="Marketplace" description="현재 프로젝트에 설치된 패키지 목록입니다." />

      <MarketplaceTabs />

      {actionError && <StatusMessage tone="error" className="mb-4">{actionError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : installed.length === 0 ? (
        <p className="text-sm text-gray-500">설치된 패키지가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {installed.map((pkg) => {
            const key = `${pkg.type}/${pkg.name}`;

            return (
              <Card
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-3"
              >
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

                <span className="font-mono text-xs text-gray-400">v{pkg.installedVersion}</span>

                {pkg.updateAvailable ? (
                  <Badge tone="warning">Update → v{pkg.latestVersion}</Badge>
                ) : (
                  <Badge tone="success">Up to date</Badge>
                )}

                <div className="flex gap-2">
                  {pkg.updateAvailable && (
                    <button
                      onClick={() => handleUpdate(pkg)}
                      disabled={busyKey === key}
                      className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-xs transition-colors disabled:opacity-50"
                    >
                      {busyKey === key ? "..." : "Update"}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(pkg)}
                    disabled={busyKey === key}
                    className="rounded bg-red-900/60 hover:bg-red-800 px-3 py-1 text-xs text-red-200 transition-colors disabled:opacity-50"
                  >
                    {busyKey === key ? "..." : "Remove"}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
