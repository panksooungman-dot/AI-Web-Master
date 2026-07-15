"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { DesignPlanRecord } from "@/lib/design/types";
import type { StoryboardRecord } from "@/lib/design/storyboard";
import type { WireframeRecord } from "@/lib/design/wireframe";
import type { PrototypeRecord } from "@/lib/design/prototype";
import type { ClaudeDesignRecord } from "@/lib/design/claude-design";
import type { ApprovalAction, ReviewRecord, ReviewStatus } from "@/lib/design/review";

interface PlansResponse {
  plans: DesignPlanRecord[];
}
interface StoryboardsResponse {
  storyboards: StoryboardRecord[];
}
interface WireframesResponse {
  wireframes: WireframeRecord[];
}
interface PrototypesResponse {
  prototypes: PrototypeRecord[];
}
interface ClaudeDesignsResponse {
  claudeDesigns: ClaudeDesignRecord[];
}
interface ReviewsResponse {
  reviews: ReviewRecord[];
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  revision_requested: "Revision Requested",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_TONES: Record<ReviewStatus, BadgeTone> = {
  draft: "neutral",
  in_review: "info",
  revision_requested: "orange",
  approved: "success",
  rejected: "danger",
  archived: "neutral",
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

function toMarkdown(
  projectName: string,
  review: ReviewRecord,
  chain: {
    plan: DesignPlanRecord | null;
    storyboard: StoryboardRecord | null;
    wireframe: WireframeRecord | null;
    prototype: PrototypeRecord | null;
    claudeDesign: ClaudeDesignRecord | null;
  }
): string {
  const lines: string[] = [];
  lines.push(`# Customer Review — ${projectName} (v${review.version})`);
  lines.push("");
  lines.push(`Generated: ${new Date(review.createdAt).toLocaleString()}`);
  lines.push("");

  lines.push("## Project");
  lines.push(chain.plan?.input.projectName ?? "—");
  lines.push(chain.plan?.content.requirementAnalysis.projectSummary ?? "");
  lines.push("");

  lines.push("## Requirement");
  for (const req of chain.plan?.content.requirementAnalysis.functionalRequirements ?? []) {
    lines.push(`- ${req}`);
  }
  lines.push("");

  lines.push("## Storyboard");
  lines.push(chain.storyboard ? `${chain.storyboard.content.screenFlow.length}개 화면 흐름` : "—");
  lines.push("");

  lines.push("## Wireframe");
  lines.push(chain.wireframe ? `${chain.wireframe.content.layouts.length}개 화면 레이아웃` : "—");
  lines.push("");

  lines.push("## Prototype");
  lines.push(chain.prototype ? chain.prototype.content.preview.summary : "—");
  lines.push("");

  lines.push("## Claude Design");
  lines.push(chain.claudeDesign?.content.designPrompt ?? "—");
  lines.push("");

  lines.push("## Review");
  lines.push(`Status: ${STATUS_LABELS[review.status]}`);
  lines.push("");

  lines.push("## Comments");
  for (const comment of review.comments) {
    lines.push(`- **${comment.author ?? "익명"}** (${new Date(comment.createdAt).toLocaleString()}): ${comment.text}`);
  }
  lines.push("");

  lines.push("## Approval Status");
  lines.push(STATUS_LABELS[review.status]);
  lines.push("");

  lines.push("## History");
  for (const entry of review.history) {
    lines.push(
      `- ${new Date(entry.timestamp).toLocaleString()} — ${STATUS_LABELS[entry.status]} (${entry.actor ?? "system"})${
        entry.note ? `: ${entry.note}` : ""
      }`
    );
  }

  return lines.join("\n");
}

export default function CustomerReviewPage() {
  const [plans, setPlans] = useState<DesignPlanRecord[]>([]);
  const [storyboards, setStoryboards] = useState<StoryboardRecord[]>([]);
  const [wireframes, setWireframes] = useState<WireframeRecord[]>([]);
  const [prototypes, setPrototypes] = useState<PrototypeRecord[]>([]);
  const [claudeDesigns, setClaudeDesigns] = useState<ClaudeDesignRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedClaudeDesignId, setSelectedClaudeDesignId] = useState<string>("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [pendingAction, setPendingAction] = useState<ApprovalAction | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      fetch("/api/design/requirements").then((res) => res.json() as Promise<PlansResponse>),
      fetch("/api/design/storyboard").then((res) => res.json() as Promise<StoryboardsResponse>),
      fetch("/api/design/wireframe").then((res) => res.json() as Promise<WireframesResponse>),
      fetch("/api/design/prototype").then((res) => res.json() as Promise<PrototypesResponse>),
      fetch("/api/design/claude").then((res) => res.json() as Promise<ClaudeDesignsResponse>),
      fetch("/api/design/review").then((res) => res.json() as Promise<ReviewsResponse>),
    ])
      .then(([plansJson, storyboardsJson, wireframesJson, prototypesJson, claudeDesignsJson, reviewsJson]) => {
        const loadedPlans = plansJson.plans ?? [];
        const loadedStoryboards = storyboardsJson.storyboards ?? [];
        const loadedWireframes = wireframesJson.wireframes ?? [];
        const loadedPrototypes = prototypesJson.prototypes ?? [];
        const loadedClaudeDesigns = claudeDesignsJson.claudeDesigns ?? [];
        const loadedReviews = reviewsJson.reviews ?? [];
        setPlans(loadedPlans);
        setStoryboards(loadedStoryboards);
        setWireframes(loadedWireframes);
        setPrototypes(loadedPrototypes);
        setClaudeDesigns(loadedClaudeDesigns);
        setReviews(loadedReviews);
        setSelectedClaudeDesignId((current) => current || loadedClaudeDesigns[0]?.id || "");
        setSelectedReviewId((current) => current ?? loadedReviews[0]?.id ?? null);
      })
      .catch(() => setLoadError("Customer Review 데이터를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const prototypeForClaudeDesign = (claudeDesignId: string): PrototypeRecord | null =>
    prototypes.find((p) => p.id === claudeDesigns.find((cd) => cd.id === claudeDesignId)?.prototypeId) ?? null;

  const wireframeForClaudeDesign = (claudeDesignId: string): WireframeRecord | null =>
    wireframes.find((w) => w.id === prototypeForClaudeDesign(claudeDesignId)?.wireframeId) ?? null;

  const storyboardForClaudeDesign = (claudeDesignId: string): StoryboardRecord | null =>
    storyboards.find((s) => s.id === wireframeForClaudeDesign(claudeDesignId)?.storyboardId) ?? null;

  const planForClaudeDesign = (claudeDesignId: string): DesignPlanRecord | null =>
    plans.find((p) => p.id === claudeDesigns.find((cd) => cd.id === claudeDesignId)?.planId) ?? null;

  const claudeDesignLabel = (claudeDesignId: string): string =>
    planForClaudeDesign(claudeDesignId)?.input.projectName ?? claudeDesignId;

  const handleCreateReview = async () => {
    if (isCreating || !selectedClaudeDesignId) return;
    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/design/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claudeDesignId: selectedClaudeDesignId }),
      });
      const json = (await res.json()) as { success: boolean; review?: ReviewRecord; error?: string };

      if (!json.success || !json.review) {
        setCreateError(json.error ?? "생성 실패");
        return;
      }

      setReviews((prev) => [json.review!, ...prev]);
      setSelectedReviewId(json.review.id);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedReview = reviews.find((r) => r.id === selectedReviewId) ?? null;
  const selectedClaudeDesign = selectedReview
    ? claudeDesigns.find((cd) => cd.id === selectedReview.claudeDesignId) ?? null
    : null;
  const selectedPrototype = selectedClaudeDesign ? prototypeForClaudeDesign(selectedClaudeDesign.id) : null;
  const selectedWireframe = selectedClaudeDesign ? wireframeForClaudeDesign(selectedClaudeDesign.id) : null;
  const selectedStoryboard = selectedClaudeDesign ? storyboardForClaudeDesign(selectedClaudeDesign.id) : null;
  const selectedPlan = selectedClaudeDesign ? planForClaudeDesign(selectedClaudeDesign.id) : null;

  const applyReviewUpdate = (record: ReviewRecord) => {
    setReviews((prev) => prev.map((r) => (r.id === record.id ? record : r)));
  };

  const handleAddComment = async () => {
    if (!selectedReview || isCommenting || !commentText.trim()) return;
    setIsCommenting(true);
    setCommentError(null);

    try {
      const res = await fetch(`/api/design/review/${selectedReview.id}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const json = (await res.json()) as { success: boolean; review?: ReviewRecord; error?: string };

      if (!json.success || !json.review) {
        setCommentError(json.error ?? "댓글 작성 실패");
        return;
      }

      applyReviewUpdate(json.review);
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleApprovalAction = async (action: ApprovalAction) => {
    if (!selectedReview || pendingAction) return;
    setPendingAction(action);
    setApprovalError(null);

    try {
      const res = await fetch("/api/design/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: selectedReview.id, action, note: note.trim() || undefined }),
      });
      const json = (await res.json()) as { success: boolean; review?: ReviewRecord; error?: string };

      if (!json.success || !json.review) {
        setApprovalError(json.error ?? "처리 실패");
        return;
      }

      applyReviewUpdate(json.review);
      setNote("");
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : "요청 실패");
    } finally {
      setPendingAction(null);
    }
  };

  const canApproveOrReject =
    selectedReview?.status === "in_review" || selectedReview?.status === "revision_requested";
  const canRequestRevision = selectedReview?.status === "in_review";

  const handleExportJson = () => {
    if (!selectedReview) return;
    downloadBlob(JSON.stringify(selectedReview, null, 2), `review-${selectedReview.id}.json`, "application/json");
  };

  const handleExportMarkdown = () => {
    if (!selectedReview) return;
    downloadBlob(
      toMarkdown(selectedPlan?.input.projectName ?? selectedReview.claudeDesignId, selectedReview, {
        plan: selectedPlan,
        storyboard: selectedStoryboard,
        wireframe: selectedWireframe,
        prototype: selectedPrototype,
        claudeDesign: selectedClaudeDesign,
      }),
      `review-${selectedReview.id}.md`,
      "text/markdown"
    );
  };

  return (
    <div>
      <PageHeader
        icon="📝"
        title="Design — Customer Review"
        description="Design Automation Phase 6: Phase 5 Claude Design 위에서 고객 검토·댓글·승인/반려/수정요청 워크플로를 지원합니다."
        actions={
          <Link href="/developer/design/claude" className="text-xs text-blue-400 hover:underline self-center">
            ← Claude Design
          </Link>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="Start Review">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Claude Design</label>
              <select
                value={selectedClaudeDesignId}
                onChange={(e) => setSelectedClaudeDesignId(e.target.value)}
                className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              >
                {claudeDesigns.length === 0 && <option value="">Claude Design이 없습니다</option>}
                {claudeDesigns.map((cd) => (
                  <option key={cd.id} value={cd.id}>
                    {claudeDesignLabel(cd.id)} — {new Date(cd.createdAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {createError && <StatusMessage tone="error">{createError}</StatusMessage>}

            <button
              onClick={handleCreateReview}
              disabled={isCreating || !selectedClaudeDesignId}
              className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isCreating ? "Starting..." : "Start Review"}
            </button>

            {claudeDesigns.length === 0 && (
              <p className="text-xs text-gray-500">
                먼저{" "}
                <Link href="/developer/design/claude" className="text-blue-400 hover:underline">
                  Claude Design
                </Link>
                을 생성하세요.
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
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-500">아직 시작된 Review가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {reviews.map((review) => (
                <li key={review.id}>
                  <button
                    onClick={() => setSelectedReviewId(review.id)}
                    className={`w-full text-left rounded px-3 py-2 text-sm transition-colors ${
                      selectedReviewId === review.id
                        ? "bg-blue-600/20 border border-blue-600"
                        : "bg-gray-800 hover:bg-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {claudeDesignLabel(review.claudeDesignId)} <span className="text-gray-500">v{review.version}</span>
                      </span>
                      <Badge tone={STATUS_TONES[review.status]}>{STATUS_LABELS[review.status]}</Badge>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {selectedReview && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Project">
              <p className="text-sm text-gray-300">{selectedPlan?.input.projectName ?? "—"}</p>
              <p className="text-xs text-gray-500">{selectedPlan?.content.requirementAnalysis.projectSummary}</p>
            </Card>

            <Card title="Requirement">
              <p className="text-sm text-gray-300">
                {selectedPlan?.content.requirementAnalysis.functionalRequirements.length ?? 0}개 기능 요구사항
              </p>
              <p className="text-xs text-gray-500">
                대상: {selectedPlan?.content.requirementAnalysis.targetUsers.join(", ") ?? "—"}
              </p>
            </Card>

            <Card title="Storyboard">
              {selectedStoryboard ? (
                <p className="text-sm text-gray-300">{selectedStoryboard.content.screenFlow.length}개 화면 흐름</p>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Wireframe">
              {selectedWireframe ? (
                <p className="text-sm text-gray-300">{selectedWireframe.content.layouts.length}개 화면 레이아웃</p>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>

            <Card title="Prototype">
              {selectedPrototype ? (
                <p className="text-sm text-gray-300">
                  v{selectedPrototype.version} — {selectedPrototype.content.preview.summary}
                </p>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>

            <Card title="Claude Design">
              {selectedClaudeDesign ? (
                <p className="text-sm text-gray-300 line-clamp-3">{selectedClaudeDesign.content.designPrompt}</p>
              ) : (
                <p className="text-sm text-gray-500">—</p>
              )}
            </Card>
          </div>

          <Card title="Review">
            <div className="flex items-center gap-3 mb-3">
              <Badge tone={STATUS_TONES[selectedReview.status]}>{STATUS_LABELS[selectedReview.status]}</Badge>
              <span className="text-xs text-gray-500">v{selectedReview.version}</span>
            </div>

            {approvalError && <StatusMessage tone="error">{approvalError}</StatusMessage>}

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="승인/반려/수정요청 사유 (선택)"
              className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500 mb-3"
              rows={2}
            />

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleApprovalAction("approve")}
                disabled={!canApproveOrReject || pendingAction !== null}
                className="rounded bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {pendingAction === "approve" ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => handleApprovalAction("reject")}
                disabled={!canApproveOrReject || pendingAction !== null}
                className="rounded bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {pendingAction === "reject" ? "Rejecting..." : "Reject"}
              </button>
              <button
                onClick={() => handleApprovalAction("revision")}
                disabled={!canRequestRevision || pendingAction !== null}
                className="rounded bg-orange-600 hover:bg-orange-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {pendingAction === "revision" ? "Requesting..." : "Request Revision"}
              </button>
            </div>
          </Card>

          <Card title="Comments">
            {commentError && <StatusMessage tone="error">{commentError}</StatusMessage>}

            <div className="flex flex-col gap-2 mb-4">
              {selectedReview.comments.length === 0 ? (
                <p className="text-sm text-gray-500">아직 댓글이 없습니다.</p>
              ) : (
                selectedReview.comments.map((comment) => (
                  <div key={comment.id} className="rounded border border-gray-800 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-200">{comment.author ?? "익명"}</span>
                      <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-300">{comment.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="댓글을 입력하세요"
                className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500"
              />
              <button
                onClick={handleAddComment}
                disabled={isCommenting || !commentText.trim()}
                className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isCommenting ? "Posting..." : "Comment"}
              </button>
            </div>
          </Card>

          <Card title="Approval Status">
            <div className="flex items-center gap-3">
              <Badge tone={STATUS_TONES[selectedReview.status]}>{STATUS_LABELS[selectedReview.status]}</Badge>
              <span className="text-xs text-gray-500">
                최종 갱신: {new Date(selectedReview.updatedAt).toLocaleString()}
              </span>
            </div>
          </Card>

          <Card title="History">
            <ol className="flex flex-col gap-2 text-sm text-gray-300">
              {selectedReview.history
                .slice()
                .reverse()
                .map((entry) => (
                  <li key={entry.id} className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONES[entry.status]}>{STATUS_LABELS[entry.status]}</Badge>
                      <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                      <span className="text-xs text-gray-500">{entry.actor ?? "system"}</span>
                    </div>
                    {entry.note && <p className="text-xs text-gray-400 mt-0.5">{entry.note}</p>}
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
