"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { WebsiteOrderRecord, WebsiteOrderStatus } from "@/lib/websiteOrders/types";
import type { ClientRecord } from "@/lib/clients/types";
import type { AiJobRecord } from "@/lib/aiJobs/types";

interface WebsiteOrdersResponse {
  websiteOrders: WebsiteOrderRecord[];
}

interface ClientsResponse {
  clients: ClientRecord[];
}

interface AiJobsResponse {
  aiJobs: AiJobRecord[];
}

const WEBSITE_ORDER_STATUS_LABELS: Record<WebsiteOrderStatus, string> = {
  Requested: "접수",
  InProgress: "처리 중",
  Review: "검수",
  Delivered: "납품 완료",
  Cancelled: "취소",
};

const WEBSITE_ORDER_STATUS_TONES: Record<WebsiteOrderStatus, BadgeTone> = {
  Requested: "info",
  InProgress: "warning",
  Review: "purple",
  Delivered: "success",
  Cancelled: "neutral",
};

type SortOption = "newest" | "oldest" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "최신순",
  oldest: "오래된순",
  name: "주문명",
};

export default function WebsiteOrdersPage() {
  const [websiteOrders, setWebsiteOrders] = useState<WebsiteOrderRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [aiJobs, setAiJobs] = useState<AiJobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    // 요구사항 — "기존 API만 사용한다"(WebsiteOrderRecord 자체 목록). 회사명 표시에는 기존
    // GET /api/clients를, AI Job 개수 표시에는 기존 GET /api/ai-jobs를 함께 사용한다(둘 다
    // 다른 도메인의 기존 API, 새 API 아님 — Clients 목록이 상태 파생을 위해 /api/website-orders를
    // 함께 쓴 것과 동일한 원칙). order.aiJobIds는 실제 파이프라인에서 채워지지 않아
    // (app/developer/website-orders/[id]/page.tsx 주석 참고) 대신 job.websiteOrderId로 센다.
    Promise.all([
      fetch("/api/website-orders").then((res) => res.json() as Promise<WebsiteOrdersResponse>),
      fetch("/api/clients").then((res) => res.json() as Promise<ClientsResponse>),
      fetch("/api/ai-jobs").then((res) => res.json() as Promise<AiJobsResponse>),
    ])
      .then(([ordersJson, clientsJson, aiJobsJson]) => {
        setWebsiteOrders(ordersJson.websiteOrders ?? []);
        setClients(clientsJson.clients ?? []);
        setAiJobs(aiJobsJson.aiJobs ?? []);
      })
      .catch(() => setLoadError("주문 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);

  const aiJobCountByOrderId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const job of aiJobs) {
      counts.set(job.websiteOrderId, (counts.get(job.websiteOrderId) ?? 0) + 1);
    }
    return counts;
  }, [aiJobs]);

  const filteredAndSorted = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = normalizedQuery
      ? websiteOrders.filter((order) => {
          const client = clientById.get(order.clientId);
          return [order.name, order.siteType, client?.companyName ?? "", client?.contactName ?? ""].some(
            (field) => field.toLowerCase().includes(normalizedQuery)
          );
        })
      : websiteOrders;

    const sorted = [...filtered];
    if (sortBy === "newest") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }, [websiteOrders, clientById, query, sortBy]);

  return (
    <div>
      <PageHeader
        icon="🧾"
        title="Website Order 관리"
        description="AI 의뢰 파이프라인(Inquiry → Client → WebsiteOrder)에서 자동 생성된 제작 주문 목록입니다. 새 Registry·API 없이 기존 lib/websiteOrders·GET /api/website-orders만 사용합니다."
        actions={
          <div className="flex items-center gap-4">
            <Link href="/developer/clients" className="text-xs text-blue-400 hover:underline self-center">
              고객사 관리 →
            </Link>
            <button
              onClick={load}
              className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="주문명·사이트 유형·고객사 검색"
          className="flex-1 min-w-[200px] rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />

        <div className="flex gap-1.5">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                sortBy === option
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : filteredAndSorted.length === 0 ? (
        <p className="text-gray-500">
          {websiteOrders.length === 0 ? "등록된 주문이 없습니다." : "검색 결과가 없습니다."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAndSorted.map((order) => {
            const client = clientById.get(order.clientId);
            return (
              <Link key={order.id} href={`/developer/website-orders/${order.id}`}>
                <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-600 transition-colors">
                  <Badge tone={WEBSITE_ORDER_STATUS_TONES[order.status]} className="w-24 text-center shrink-0">
                    {WEBSITE_ORDER_STATUS_LABELS[order.status]}
                  </Badge>

                  <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">{order.name}</span>

                  <span className="text-xs text-gray-400 w-32 shrink-0 truncate">
                    {client?.companyName || client?.contactName || "-"}
                  </span>

                  <span className="text-xs text-gray-400 w-24 shrink-0 truncate">{order.siteType}</span>

                  <span className="font-mono text-xs text-gray-500 w-32 shrink-0">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex gap-1.5 sm:ml-auto shrink-0">
                    <Badge tone="accent">AI Job {aiJobCountByOrderId.get(order.id) ?? 0}</Badge>
                    <Badge tone="purple">Website {order.websiteIds.length}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
