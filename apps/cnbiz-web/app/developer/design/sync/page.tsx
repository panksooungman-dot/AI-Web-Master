"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { ReviewRecord } from "@/lib/design/review";
import type { ConflictEntry, DesignSnapshot, CodeSnapshot, PatchEntry, SyncDirection, SyncRecord, SyncStatus } from "@/lib/design/design-sync";

interface PlansResponse {
  plans: DesignPlanRecord[];
}
interface ReviewsResponse {
  reviews: ReviewRecord[];
}
interface SyncsResponse {
  syncs: SyncRecord[];
}

const STATUS_LABELS: Record<SyncStatus, string> = {
  in_sync: "In Sync",
  conflict: "Conflict",
  rolled_back: "Rolled Back",
};

const STATUS_TONES: Record<SyncStatus, BadgeTone> = {
  in_sync: "success",
  conflict: "danger",
  rolled_back: "orange",
};

const DIRECTION_LABELS: Record<SyncDirection, string> = {
  "design-to-code": "Design → Code",
  "code-to-design": "Code → Design",
};

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(projectName: string, record: SyncRecord): string {
  const lines: string[] = [];
  lines.push(`# Design Sync — ${projectName} (v${record.version})`);
  lines.push("");
  lines.push(`Direction: ${DIRECTION_LABELS[record.direction]}`);
  lines.push(`Status: ${STATUS_LABELS[record.status]}`);
  lines.push("");

  lines.push("## Patch");
  for (const entry of record.patch) {
    lines.push(`- [${entry.type}] ${entry.target}: ${entry.detail}`);
  }
  lines.push("");

  lines.push("## Conflicts");
  if (record.conflicts.length === 0) lines.push("없음");
  for (const conflict of record.conflicts) {
    lines.push(`- ${conflict.target}: design="${conflict.designValue}" code="${conflict.codeValue}"`);
  }
  lines.push("");

  lines.push("## History");
  for (const entry of record.history) {
    lines.push(
      `- v${entry.version} ${entry.action}${entry.direction ? ` (${DIRECTION_LABELS[entry.direction]})` : ""} — ${STATUS_LABELS[entry.status]} — ${new Date(entry.timestamp).toLocaleString()} (${entry.actor ?? "system"})`
    );
  }

  return lines.join("\n");
}

interface CompareResult {
  status: SyncStatus;
  patch: PatchEntry[];
  conflicts: ConflictEntry[];
  compare: { designSnapshot: DesignSnapshot; codeSnapshot: CodeSnapshot };
}

export default function DesignSyncPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [syncs, setSyncs] = useState<SyncRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [direction, setDirection] = useState<SyncDirection>("design-to-code");
  const [codeOverrideText, setCodeOverrideText] = useState("");
  const [selectedSyncId, setSelectedSyncId] = useState<string | null>(null);

  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const [pendingRollbackVersion, setPendingRollbackVersion] = useState<number | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/review").then((res) => res.json() as Promise<ReviewsResponse>),
      fetch("/api/design/sync").then((res) => res.json() as Promise<SyncsResponse>),
    ])
      .then(([plansJson, reviewsJson, syncsJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedReviews = reviewsJson.reviews ?? [];
        const loadedSyncs = syncsJson.syncs ?? [];
        setPlans(loadedPlans);
        setReviews(loadedReviews);
        setSyncs(loadedSyncs);
        setSelectedReviewId((current) => current || loadedReviews[0]?.id || "");
        setSelectedSyncId((current) => current ?? loadedSyncs[0]?.id ?? null);
      })
      .catch(() => setLoadError("Design Sync 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const planForReview = (reviewId: string): DesignPlanRecord | null => {
    const review = reviews.find((r) => r.id === reviewId);
    return review ? plans.find((p) => p.id === review.planId) ?? null : null;
  };

  const reviewLabel = (reviewId: string): string => {
    const review = reviews.find((r) => r.id === reviewId);
    const name = planForReview(reviewId)?.input.projectName ?? reviewId;
    return review ? `${name} (v${review.version}, ${review.status})` : name;
  };

  const parseCodeOverride = (): Record<string, unknown> | null => {
    if (!codeOverrideText.trim()) return null;
    try {
      return JSON.parse(codeOverrideText);
    } catch {
      return null;
    }
  };

  const handleCompare = async () => {
    if (isComparing || !selectedReviewId) return;
    setIsComparing(true);
    setCompareError(null);
    setCompareResult(null);

    const codeOverride = direction === "code-to-design" ? parseCodeOverride() : null;
    if (direction === "code-to-design" && codeOverrideText.trim() && codeOverride === null) {
      setCompareError("Code Override는 올바른 JSON이어야 합니다.");
      setIsComparing(false);
      return;
    }

    try {
      const res = await fetch("/api/design/sync/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: selectedReviewId, direction, codeOverride }),
      });
      const json = (await res.json()) as CompareResult & { success: boolean; error?: string };

      if (!json.success) {
        setCompareError(json.error ?? "Compare 실패");
        return;
      }

      setCompareResult({ status: json.status, patch: json.patch, conflicts: json.conflicts, compare: json.compare });
    } catch (err) {
      setCompareError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsComparing(false);
    }
  };

  const handleSync = async () => {
    if (isSyncing || !selectedReviewId) return;
    setIsSyncing(true);
    setSyncError(null);

    const codeOverride = direction === "code-to-design" ? parseCodeOverride() : null;
    if (direction === "code-to-design" && codeOverrideText.trim() && codeOverride === null) {
      setSyncError("Code Override는 올바른 JSON이어야 합니다.");
      setIsSyncing(false);
      return;
    }

    try {
      const res = await fetch("/api/design/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: selectedReviewId, direction, codeOverride }),
      });
      const json = (await res.json()) as { success: boolean; sync?: SyncRecord; error?: string };

      if (!json.success || !json.sync) {
        setSyncError(json.error ?? "Sync 실패");
        return;
      }

      setSyncs((prev) => [json.sync!, ...prev.filter((s) => s.id !== json.sync!.id)]);
      setSelectedSyncId(json.sync.id);
      setCompareResult(null);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRollback = async (syncId: string, toVersion: number) => {
    setPendingRollbackVersion(toVersion);
    setRollbackError(null);

    try {
      const res = await fetch("/api/design/sync/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncId, toVersion }),
      });
      const json = (await res.json()) as { success: boolean; sync?: SyncRecord; error?: string };

      if (!json.success || !json.sync) {
        setRollbackError(json.error ?? "Rollback 실패");
        return;
      }

      setSyncs((prev) => prev.map((s) => (s.id === json.sync!.id ? json.sync! : s)));
    } catch (err) {
      setRollbackError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setPendingRollbackVersion(null);
    }
  };

  const selectedSync = syncs.find((s) => s.id === selectedSyncId) ?? null;
  const selectedPlanForSync = selectedSync
    ? plans.find((p) => p.id === selectedSync.planId) ?? null
    : null;

  const handleExportJson = () => {
    if (!selectedSync) return;
    downloadBlob(JSON.stringify(selectedSync, null, 2), `design-sync-${selectedSync.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedSync) return;
    downloadBlob(
      toMarkdown(selectedPlanForSync?.input.projectName ?? selectedSync.reviewId, selectedSync),
      `design-sync-${selectedSync.id}.md`,
      "text/markdown"
    );
  };

  return (
    <div>
      <PageHeader
        icon="🔄"
        title="Design — Design Sync"
        description="Design Automation Phase 8: Wireframe/Prototype/Claude Design/Figma 체인과 Code 사이의 양방향 동기화를 지원합니다."
        actions={
          <div className="flex items-center gap-4">
            <Link href="/developer/design/figma" className="text-xs text-blue-400 hover:underline">
              ← Figma
            </Link>
            <Link href="/developer/design/website" className="text-xs text-blue-400 hover:underline">
              Website Builder →
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Run Sync">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Review</label>
              <select
                value={selectedReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {reviews.length === 0 && <option value="">Review가 없습니다</option>}
                {reviews.map((review) => (
                  <option key={review.id} value={review.id}>
                    {reviewLabel(review.id)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as SyncDirection)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                <option value="design-to-code">Design → Code</option>
                <option value="code-to-design">Code → Design</option>
              </select>
            </div>

            {direction === "code-to-design" && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {'Code Override (선택, JSON — 예: {"theme":"...", "components":[{"name":"Header","code":"..."}]})'}
                </label>
                <textarea
                  value={codeOverrideText}
                  onChange={(e) => setCodeOverrideText(e.target.value)}
                  placeholder='{"theme": ":root { --primary: #ff0000; }"}'
                  rows={3}
                  className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500 font-mono"
                />
              </div>
            )}

            {compareError && <StatusMessage tone="error">{compareError}</StatusMessage>}
            {syncError && <StatusMessage tone="error">{syncError}</StatusMessage>}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCompare}
                disabled={isComparing || !selectedReviewId}
                className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isComparing ? "Comparing..." : "Compare"}
              </button>
              <button
                onClick={handleSync}
                disabled={isSyncing || !selectedReviewId}
                className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isSyncing ? "Syncing..." : "Sync"}
              </button>
            </div>

            {reviews.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저{" "}
                <Link href="/developer/design/review" className="text-blue-400 hover:underline">
                  Review
                </Link>
                를 생성하세요.
              </p>
            )}

            {compareResult && (
              <div className="mt-2 rounded border border-gray-800 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">Pending Changes</span>
                  <Badge tone={STATUS_TONES[compareResult.status]}>{STATUS_LABELS[compareResult.status]}</Badge>
                </div>
                {compareResult.patch.length === 0 ? (
                  <p className="text-xs text-gray-500">변경사항이 없습니다.</p>
                ) : (
                  <ul className="flex flex-col gap-1 text-xs text-gray-300 max-h-48 overflow-y-auto">
                    {compareResult.patch.map((entry, i) => (
                      <li key={i}>
                        <span className="text-gray-500">[{entry.type}]</span> {entry.target} — {entry.detail}
                      </li>
                    ))}
                  </ul>
                )}
                {compareResult.conflicts.length > 0 && (
                  <p className="text-xs text-red-400 mt-2">{compareResult.conflicts.length}건의 충돌이 감지되었습니다.</p>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card
          title="History"
          actions={
            <button onClick={load} className="text-xs text-blue-400 hover:underline">
              Refresh
            </button>
          }
        >
          {isLoading ? (
            <LoadingText />
          ) : loadError ? (
            <StatusMessage tone="error">{loadError}</StatusMessage>
          ) : syncs.length === 0 ? (
            <p className="text-sm text-gray-500">아직 실행된 Sync가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {syncs.map((sync) => (
                <li key={sync.id}>
                  <button
                    onClick={() => setSelectedSyncId(sync.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedSyncId === sync.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {reviewLabel(sync.reviewId)} <span className="text-gray-500">v{sync.version}</span>
                      </span>
                      <Badge tone={STATUS_TONES[sync.status]}>{STATUS_LABELS[sync.status]}</Badge>
                    </div>
                    <span className="text-xs text-gray-500">{DIRECTION_LABELS[sync.direction]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedSync && (
        <div className="flex flex-col gap-6">
          <Card title="Sync Status">
            <div className="flex items-center gap-3">
              <Badge tone={STATUS_TONES[selectedSync.status]}>{STATUS_LABELS[selectedSync.status]}</Badge>
              <span className="text-xs text-gray-500">v{selectedSync.version}</span>
              <span className="text-xs text-gray-500">{DIRECTION_LABELS[selectedSync.direction]}</span>
              <span className="text-xs text-gray-500">최종 갱신: {new Date(selectedSync.updatedAt).toLocaleString()}</span>
            </div>
          </Card>

          <Card title="Conflicts">
            {selectedSync.conflicts.length === 0 ? (
              <p className="text-sm text-gray-500">충돌이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm text-gray-300">
                {selectedSync.conflicts.map((conflict, i) => (
                  <li key={i} className="rounded border border-red-900/50 p-2">
                    <p className="font-semibold text-red-300">{conflict.target}</p>
                    <p className="text-xs text-gray-400">design: {conflict.designValue}</p>
                    <p className="text-xs text-gray-400">code: {conflict.codeValue}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Version History">
            {rollbackError && <StatusMessage tone="error">{rollbackError}</StatusMessage>}
            <ol className="flex flex-col gap-2 text-sm text-gray-300">
              {selectedSync.history
                .slice()
                .reverse()
                .map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 rounded border border-gray-800 p-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">v{entry.version}</span>
                        <Badge tone={STATUS_TONES[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
                        <span className="text-xs text-gray-500">
                          {entry.action}
                          {entry.direction ? ` · ${DIRECTION_LABELS[entry.direction]}` : ""}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString()} ({entry.actor ?? "system"})
                      </span>
                    </div>
                    {entry.version !== selectedSync.version && (
                      <button
                        onClick={() => handleRollback(selectedSync.id, entry.version)}
                        disabled={pendingRollbackVersion !== null}
                        className="rounded bg-orange-600 hover:bg-orange-700 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
                      >
                        {pendingRollbackVersion === entry.version ? "Rolling back..." : `Rollback to v${entry.version}`}
                      </button>
                    )}
                  </li>
                ))}
            </ol>
          </Card>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleExportJson}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Export JSON
            </button>
            <button
              onClick={handleExportMarkdown}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Export Markdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
