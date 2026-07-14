"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { CatalogSummary, InstalledPackageInfo } from "@/lib/marketplace/registry";

export function MarketplaceWidget() {
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [installedCount, setInstalledCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/marketplace")
      .then((res) => res.json())
      .then((json: { catalog: CatalogSummary }) => setCatalog(json.catalog))
      .catch(() => setCatalog({ categories: [], totalAvailable: 0 }));

    fetch("/api/marketplace/installed")
      .then((res) => res.json())
      .then((json: { installed: InstalledPackageInfo[] }) => setInstalledCount((json.installed ?? []).length))
      .catch(() => setInstalledCount(0));
  }, []);

  const isLoading = catalog === null || installedCount === null;

  return (
    <Card
      title="Marketplace Packages"
      actions={
        <Link href="/developer/marketplace" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("MarketplaceWidget", "components/developer/dashboard/MarketplaceWidget.tsx")}
    >
      {isLoading ? (
        <LoadingText />
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Installed</span>
            <span className="text-gray-200">{installedCount}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Available</span>
            <span className="text-gray-200">{catalog.totalAvailable}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}
