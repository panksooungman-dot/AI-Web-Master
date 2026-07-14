"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { InstalledPackageInfo, MarketplaceEntry } from "@/lib/marketplace/registry";

interface DetailsResponse {
  success: boolean;
  entry?: MarketplaceEntry;
  installed?: InstalledPackageInfo;
  error?: string;
}

export default function PackageDetailsPage() {
  const { type, name } = useParams<{ type: string; name: string }>();
  const decodedName = decodeURIComponent(name);
  const router = useRouter();

  const [data, setData] = useState<DetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/marketplace/${type}/${encodeURIComponent(decodedName)}`)
      .then((res) => res.json())
      .then((json: DetailsResponse) => {
        if (!json.success) {
          setLoadError(json.error ?? "패키지를 찾을 수 없습니다.");
          return;
        }
        setData(json);
      })
      .catch(() => setLoadError("패키지 정보를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, decodedName]);

  const runAction = async (method: "POST" | "DELETE" | "PATCH") => {
    if (isBusy) return;

    setIsBusy(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/marketplace/${type}/${encodeURIComponent(decodedName)}`, { method });
      const json = (await res.json()) as { success: boolean; error?: string };

      if (!json.success) {
        setActionError(json.error ?? "요청 실패");
        return;
      }

      if (method === "DELETE") {
        router.push("/developer/marketplace/installed");
        return;
      }

      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader icon="🧩" title={decodedName} description="패키지 상세 정보" />
        <LoadingText />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div>
        <PageHeader icon="🧩" title={decodedName} description="패키지 상세 정보" />
        <StatusMessage tone="error">{loadError ?? "패키지를 찾을 수 없습니다."}</StatusMessage>
      </div>
    );
  }

  const { entry, installed } = data;

  return (
    <div>
      <PageHeader
        icon="🧩"
        title={decodedName}
        description={entry?.description ?? installed?.description ?? ""}
        actions={<Badge tone="accent">{type}</Badge>}
      />

      {actionError && <StatusMessage tone="error" className="mb-4">{actionError}</StatusMessage>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Manifest">
          <ul className="flex flex-col gap-1.5 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Version (published)</span>
              <span className="font-mono text-xs text-gray-300">{entry?.version ?? "-"}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Author</span>
              <span className="text-gray-300">{entry?.author ?? installed?.author ?? "-"}</span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-gray-500">Published</span>
              <span className="text-xs text-gray-400">
                {entry?.publishedAt ? new Date(entry.publishedAt).toLocaleString() : "게시되지 않음"}
              </span>
            </li>
          </ul>
        </Card>

        <Card title="Installation">
          {installed ? (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-1.5 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Installed Version</span>
                  <span className="font-mono text-xs text-gray-300">{installed.installedVersion}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Status</span>
                  {installed.updateAvailable ? (
                    <Badge tone="warning">Update → v{installed.latestVersion}</Badge>
                  ) : (
                    <Badge tone="success">Up to date</Badge>
                  )}
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-gray-500 shrink-0">Path</span>
                  <span className="text-xs text-gray-400 font-mono break-all text-right">{installed.dir}</span>
                </li>
              </ul>
              <div className="flex gap-2">
                {installed.updateAvailable && (
                  <button
                    onClick={() => runAction("PATCH")}
                    disabled={isBusy}
                    className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-sm transition-colors disabled:opacity-50"
                  >
                    Update
                  </button>
                )}
                <button
                  onClick={() => runAction("DELETE")}
                  disabled={isBusy}
                  className="rounded bg-red-900/60 hover:bg-red-800 px-3 py-1 text-sm text-red-200 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="mb-3 text-sm text-gray-500">설치되어 있지 않습니다.</p>
              <button
                onClick={() => runAction("POST")}
                disabled={isBusy || !entry}
                className="rounded bg-green-600 hover:bg-green-700 px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                {isBusy ? "Installing..." : "Install"}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
