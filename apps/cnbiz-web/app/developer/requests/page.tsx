"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ProjectRequestRecord, RequestStatus } from "@/lib/requests/types";

interface RequestsResponse {
  requests: ProjectRequestRecord[];
}

const STATUS_LABELS: Record<RequestStatus, string> = {
  New: "신규",
  InReview: "검토중",
  Accepted: "진행중",
  Rejected: "반려",
  Completed: "완료",
};

const STATUS_TONES: Record<RequestStatus, BadgeTone> = {
  New: "info",
  InReview: "warning",
  Accepted: "success",
  Rejected: "danger",
  Completed: "neutral",
};

const FILTERS: ("All" | RequestStatus)[] = ["All", "New", "InReview", "Accepted", "Rejected", "Completed"];

export default function RequestsPage() {
  const [requests, setRequests] = useState<ProjectRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | RequestStatus>("All");

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/requests")
      .then((res) => res.json())
      .then((json: RequestsResponse) => setRequests(json.requests ?? []))
      .catch(() => setLoadError("의뢰 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const filtered = filter === "All" ? requests : requests.filter((request) => request.status === filter);

  return (
    <div>
      <PageHeader
        icon="📝"
        title="의뢰 관리"
        description="고객이 /request 페이지에서 접수한 홈페이지 제작 의뢰 목록입니다."
        actions={
          <button
            onClick={load}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((option) => (
          <button
            key={option}
            onClick={() => setFilter(option)}
            className={`rounded-full border px-4 py-1 text-sm font-semibold transition-colors ${
              filter === option
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {option === "All" ? "All" : STATUS_LABELS[option]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">접수된 의뢰가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((request) => (
            <Link key={request.id} href={`/developer/requests/${request.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(request.createdAt).toLocaleString()}
                </span>

                <Badge tone={STATUS_TONES[request.status]} className="w-20 text-center">
                  {STATUS_LABELS[request.status]}
                </Badge>

                <span className="text-sm font-semibold text-white w-40 shrink-0 truncate">
                  {request.companyName}
                </span>

                <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{request.contactName}</span>

                <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{request.siteType}</span>

                <p className="flex-1 text-sm text-gray-300 truncate">{request.message}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
