"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import { MarketplaceTabs } from "@/components/developer/marketplace/MarketplaceTabs";
import type { CatalogSummary, MarketplaceEntry, PackageType } from "@/lib/marketplace/registry";

interface SearchResponse {
  catalog: CatalogSummary;
  success: boolean;
  results: MarketplaceEntry[];
  error?: string;
}

const TYPE_OPTIONS: { value: PackageType | ""; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "agent", label: "Agent" },
  { value: "workflow", label: "Workflow" },
  { value: "skill", label: "Skill" },
];

export default function MarketplaceBrowsePage() {
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null);
  const [results, setResults] = useState<MarketplaceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<PackageType | "">("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    const params = new URLSearchParams();
    if (keyword.trim()) params.set("keyword", keyword.trim());
    if (type) params.set("type", type);

    fetch(`/api/marketplace?${params.toString()}`)
      .then((res) => res.json())
      .then((data: SearchResponse) => {
        setCatalog(data.catalog);
        if (!data.success) {
          setLoadError(data.error ?? "검색 실패");
          setResults([]);
          return;
        }
        setResults(data.results ?? []);
      })
      .catch(() => setLoadError("Marketplace 검색에 실패했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = async (entry: MarketplaceEntry) => {
    const key = `${entry.type}/${entry.name}`;
    if (busyKey) return;

    setBusyKey(key);
    setActionError(null);

    try {
      const res = await fetch(`/api/marketplace/${entry.type}/${encodeURIComponent(entry.name)}`, {
        method: "POST",
      });
      const data = (await res.json()) as { success: boolean; error?: string };

      if (!data.success) {
        setActionError(data.error ?? "설치 실패");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <PageHeader
        icon="🧩"
        title="Marketplace"
        description="Agent·Workflow·Skill 패키지를 검색하고 설치합니다."
      />

      <MarketplaceTabs />

      {catalog && catalog.categories.length > 0 && (
        <Card title="Catalog" className="mb-6">
          <ul className="flex flex-wrap gap-3 text-sm">
            {catalog.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-1.5">
                <span className="text-gray-400">{c.id}</span>
                <Badge tone={c.count > 0 ? "accent" : "neutral"}>{c.count}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search packages..."
          className="w-full sm:max-w-sm rounded bg-gray-900 border border-gray-700 px-4 py-2 outline-none focus:border-green-500"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PackageType | "")}
          className="rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm transition-colors"
        >
          Search
        </button>
      </div>

      {actionError && <StatusMessage tone="error" className="mb-4">{actionError}</StatusMessage>}

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-500">
          검색 결과가 없습니다. 게시된 패키지가 없다면 <code>ai marketplace publish</code>로 먼저 게시하세요.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((entry) => {
            const key = `${entry.type}/${entry.name}`;

            return (
              <Card
                key={key}
                title={entry.name}
                actions={<Badge tone="accent">{entry.type}</Badge>}
              >
                <p className="mb-2 text-sm text-gray-400">{entry.description}</p>
                <p className="mb-3 text-xs text-gray-600">
                  v{entry.version} · {entry.author}
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/developer/marketplace/${entry.type}/${encodeURIComponent(entry.name)}`}
                    className="rounded bg-gray-700 hover:bg-gray-600 px-3 py-1 text-sm transition-colors"
                  >
                    Details
                  </Link>
                  <button
                    onClick={() => handleInstall(entry)}
                    disabled={busyKey === key}
                    className="rounded bg-green-600 hover:bg-green-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
                  >
                    {busyKey === key ? "Installing..." : "Install"}
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
