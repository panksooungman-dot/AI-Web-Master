"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { CatalogSummary, InstalledPackage } from "@/lib/marketplace/registry";

export function MarketplaceWidget() {
  const [data, setData] = useState<{ catalog: CatalogSummary; installed: InstalledPackage[] } | null>(null);

  useEffect(() => {
    fetch("/api/marketplace")
      .then((res) => res.json())
      .then((json: { catalog: CatalogSummary; installed: InstalledPackage[] }) => setData(json))
      .catch(() => setData({ catalog: { categories: [], totalAvailable: 0 }, installed: [] }));
  }, []);

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
      {data === null ? (
        <LoadingText />
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Installed</span>
            <span className="text-gray-200">{data.installed.length}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Available</span>
            <span className="text-gray-200">{data.catalog.totalAvailable}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}
