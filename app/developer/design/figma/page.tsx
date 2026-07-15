"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { ClaudeDesignRecord } from "@/lib/design/claude-design";
import type { ReviewRecord } from "@/lib/design/review";
import type { FigmaRecord } from "@/lib/design/figma";

interface PlansResponse {
  plans: DesignPlanRecord[];
}
interface ClaudeDesignsResponse {
  claudeDesigns: ClaudeDesignRecord[];
}
interface ReviewsResponse {
  reviews: ReviewRecord[];
}
interface FigmaFilesResponse {
  figmaFiles: FigmaRecord[];
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(projectName: string, record: FigmaRecord): string {
  const lines: string[] = [];
  lines.push(`# Figma — ${projectName} (${record.fileName})`);
  lines.push("");
  lines.push(`File ID: ${record.figmaFileId}`);
  lines.push(`Version: ${record.version}${record.simulated ? " (simulated)" : ""}`);
  lines.push("");

  lines.push("## Pages");
  for (const page of record.content.pages) {
    lines.push(`- ${page.name} (${page.frameCount} frames)`);
  }
  lines.push("");

  lines.push("## Frames");
  for (const frame of record.content.frames) {
    lines.push(`- ${frame.name} — ${frame.breakpoint} (${frame.width}x${frame.height})`);
  }
  lines.push("");

  lines.push("## Components");
  for (const component of record.content.components) {
    lines.push(`- ${component.name} (${component.type})`);
  }
  lines.push("");

  lines.push("## Design Tokens");
  for (const token of record.content.tokens) {
    lines.push(`- ${token.name} (${token.category}): ${token.value}`);
  }
  lines.push("");

  lines.push("## Assets");
  for (const asset of record.content.assets) {
    lines.push(`- ${asset.name} (${asset.type})`);
  }
  lines.push("");

  lines.push("## History");
  const combined = [
    ...record.importHistory.map((h) => ({ ...h, label: "Import" })),
    ...record.exportHistory.map((h) => ({ ...h, label: "Export" })),
  ].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const entry of combined) {
    lines.push(
      `- ${new Date(entry.timestamp).toLocaleString()} — ${entry.label} v${entry.version} (${entry.actor ?? "system"})${
        entry.simulated ? " [simulated]" : ""
      }`
    );
  }

  return lines.join("\n");
}

export default function FigmaPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [claudeDesigns, setClaudeDesigns] = useState<ClaudeDesignRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [figmaFiles, setFigmaFiles] = useState<FigmaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedReviewId, setSelectedReviewId] = useState<string>("");
  const [figmaFileIdInput, setFigmaFileIdInput] = useState("");
  const [fileNameInput, setFileNameInput] = useState("");
  const [selectedFigmaId, setSelectedFigmaId] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/claude").then((res) => res.json() as Promise<ClaudeDesignsResponse>),
      fetch("/api/design/review").then((res) => res.json() as Promise<ReviewsResponse>),
      fetch("/api/design/figma").then((res) => res.json() as Promise<FigmaFilesResponse>),
    ])
      .then(([plansJson, claudeDesignsJson, reviewsJson, figmaFilesJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedClaudeDesigns = claudeDesignsJson.claudeDesigns ?? [];
        const loadedReviews = reviewsJson.reviews ?? [];
        const loadedFigmaFiles = figmaFilesJson.figmaFiles ?? [];
        setPlans(loadedPlans);
        setClaudeDesigns(loadedClaudeDesigns);
        setReviews(loadedReviews);
        setFigmaFiles(loadedFigmaFiles);

        const approved = loadedReviews.filter((r) => r.status === "approved");
        setSelectedReviewId((current) => current || approved[0]?.id || "");
        setSelectedFigmaId((current) => current ?? loadedFigmaFiles[0]?.id ?? null);
      })
      .catch(() => setLoadError("Figma 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const approvedReviews = reviews.filter((r) => r.status === "approved");

  const planForReview = (reviewId: string): DesignPlanRecord | null => {
    const review = reviews.find((r) => r.id === reviewId);
    return review ? plans.find((p) => p.id === review.planId) ?? null : null;
  };

  const reviewLabel = (reviewId: string): string => {
    const review = reviews.find((r) => r.id === reviewId);
    const name = planForReview(reviewId)?.input.projectName ?? reviewId;
    return review ? `${name} (v${review.version})` : name;
  };

  const handleImport = async () => {
    if (isImporting || !selectedReviewId || !figmaFileIdInput.trim()) return;
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch("/api/design/figma/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedReviewId,
          figmaFileId: figmaFileIdInput.trim(),
          fileName: fileNameInput.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { success: boolean; figma?: FigmaRecord; error?: string };

      if (!json.success || !json.figma) {
        setImportError(json.error ?? "Import 실패");
        return;
      }

      setFigmaFiles((prev) => [json.figma!, ...prev.filter((f) => f.id !== json.figma!.id)]);
      setSelectedFigmaId(json.figma.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    if (isExporting || !selectedReviewId) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const res = await fetch("/api/design/figma/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedReviewId,
          figmaFileId: figmaFileIdInput.trim() || undefined,
          fileName: fileNameInput.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { success: boolean; figma?: FigmaRecord; error?: string };

      if (!json.success || !json.figma) {
        setExportError(json.error ?? "Export 실패");
        return;
      }

      setFigmaFiles((prev) => [json.figma!, ...prev.filter((f) => f.id !== json.figma!.id)]);
      setSelectedFigmaId(json.figma.id);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFigma = figmaFiles.find((f) => f.id === selectedFigmaId) ?? null;
  const selectedPlanForFigma = selectedFigma
    ? plans.find((p) => p.id === selectedFigma.planId) ?? null
    : null;

  const combinedHistory = selectedFigma
    ? [
        ...selectedFigma.importHistory.map((h) => ({ ...h, label: "Import" as const })),
        ...selectedFigma.exportHistory.map((h) => ({ ...h, label: "Export" as const })),
      ].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    : [];

  const handleExportJson = () => {
    if (!selectedFigma) return;
    downloadBlob(JSON.stringify(selectedFigma, null, 2), `figma-${selectedFigma.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedFigma) return;
    downloadBlob(
      toMarkdown(selectedPlanForFigma?.input.projectName ?? selectedFigma.planId, selectedFigma),
      `figma-${selectedFigma.id}.md`,
      "text/markdown"
    );
  };

  return (
    <div>
      <PageHeader
        icon="🎯"
        title="Design — Figma"
        description="Design Automation Phase 7: Approved Review 위에서 Figma Import/Export를 지원합니다."
        actions={
          <Link href="/developer/design/review" className="text-xs text-blue-400 hover:underline self-center">
            ← Review
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Approved Design">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Approved Review</label>
              <select
                value={selectedReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {approvedReviews.length === 0 && <option value="">승인된 Review가 없습니다</option>}
                {approvedReviews.map((review) => (
                  <option key={review.id} value={review.id}>
                    {reviewLabel(review.id)} — {new Date(review.updatedAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Figma File ID</label>
              <input
                type="text"
                value={figmaFileIdInput}
                onChange={(e) => setFigmaFileIdInput(e.target.value)}
                placeholder="예: abcDEF1234 (Export 시 비워두면 자동 생성)"
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">File Name (선택)</label>
              <input
                type="text"
                value={fileNameInput}
                onChange={(e) => setFileNameInput(e.target.value)}
                placeholder="Figma 파일 이름"
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
            </div>

            {importError && <StatusMessage tone="error">{importError}</StatusMessage>}
            {exportError && <StatusMessage tone="error">{exportError}</StatusMessage>}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleImport}
                disabled={isImporting || !selectedReviewId || !figmaFileIdInput.trim()}
                className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import"}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting || !selectedReviewId}
                className="rounded bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export"}
              </button>
            </div>

            {approvedReviews.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저{" "}
                <Link href="/developer/design/review" className="text-blue-400 hover:underline">
                  Review
                </Link>
                에서 디자인을 승인(Approve)하세요. Export는 Approved 상태에서만 가능합니다.
              </p>
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
          ) : figmaFiles.length === 0 ? (
            <p className="text-sm text-gray-500">아직 연결된 Figma 파일이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {figmaFiles.map((figma) => (
                <li key={figma.id}>
                  <button
                    onClick={() => setSelectedFigmaId(figma.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedFigmaId === figma.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {figma.fileName} <span className="text-gray-500">v{figma.version}</span>
                      </span>
                      {figma.simulated && <Badge tone="warning">Simulated</Badge>}
                    </div>
                    <span className="text-xs text-gray-500">{figma.figmaFileId}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedFigma && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{selectedPlanForFigma?.input.projectName ?? "—"}</p>
              <p className="text-xs text-gray-500">File ID: {selectedFigma.figmaFileId}</p>
            </Card>

            <Card title="Claude Design">
              {(() => {
                const review = reviews.find((r) => r.id === selectedFigma.reviewId);
                const claudeDesign = review ? claudeDesigns.find((cd) => cd.id === review.claudeDesignId) : null;
                return claudeDesign ? (
                  <p className="text-sm text-gray-300 line-clamp-3">{claudeDesign.content.designPrompt}</p>
                ) : (
                  <p className="text-sm text-gray-500">—</p>
                );
              })()}
            </Card>
          </div>

          <Card title="Pages">
            {selectedFigma.content.pages.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {selectedFigma.content.pages.map((page) => (
                  <li key={page.id} className="flex items-center justify-between gap-3">
                    <span>{page.name}</span>
                    <span className="text-xs text-gray-500">{page.frameCount} frames</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Frames">
            {selectedFigma.content.frames.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {selectedFigma.content.frames.map((frame) => (
                  <li key={frame.id} className="flex items-center justify-between gap-3">
                    <span>{frame.name}</span>
                    <span className="text-xs text-gray-500">
                      {frame.breakpoint} · {frame.width}x{frame.height}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Components">
            {selectedFigma.content.components.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {selectedFigma.content.components.map((component) => (
                  <li key={component.id} className="flex items-center justify-between gap-3">
                    <span>{component.name}</span>
                    <span className="text-xs text-gray-500">{component.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Design Tokens">
            {selectedFigma.content.tokens.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {selectedFigma.content.tokens.map((token) => (
                  <li key={token.id} className="flex items-center justify-between gap-3">
                    <span>
                      {token.name} <span className="text-xs text-gray-500">({token.category})</span>
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{token.value}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Assets">
            {selectedFigma.content.assets.length === 0 ? (
              <p className="text-sm text-gray-500">—</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-gray-300">
                {selectedFigma.content.assets.map((asset) => (
                  <li key={asset.id} className="flex items-center justify-between gap-3">
                    <span>{asset.name}</span>
                    <span className="text-xs text-gray-500">{asset.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="History">
            <ol className="flex flex-col gap-2 text-sm text-gray-300">
              {combinedHistory.map((entry) => (
                <li key={entry.id} className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <Badge tone={entry.label === "Import" ? "info" : "purple"}>
                      {entry.label} v{entry.version}
                    </Badge>
                    <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{entry.actor ?? "system"}</span>
                    {entry.simulated && <Badge tone="warning">Simulated</Badge>}
                  </div>
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
