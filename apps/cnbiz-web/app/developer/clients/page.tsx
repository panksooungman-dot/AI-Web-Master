"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";

interface ClientsResponse {
  clients: ClientRecord[];
}

interface WebsiteOrdersResponse {
  websiteOrders: WebsiteOrderRecord[];
}

type ClientStatusLabel = "신규" | "진행중" | "완료" | "취소";

interface ClientStatus {
  label: ClientStatusLabel;
  tone: BadgeTone;
}

/**
 * Client(lib/clients/types.ts) 자체에는 status 필드가 없다("Client는 상태 전이가 없는 순수
 * 신원 레코드", app/api/clients/[id]/route.ts 주석 참고) — 새 Status를 만드는 대신, 연결된
 * WebsiteOrder(이미 존재하는 WebsiteOrderStatus)의 최신 상태를 그대로 화면에서만 파생한다
 * (app/developer/inquiries/page.tsx가 Inquiry+AiJob 조합으로 파생 상태를 만드는 것과 동일한 원칙).
 */
function deriveClientStatus(client: ClientRecord, websiteOrders: WebsiteOrderRecord[]): ClientStatus {
  const orders = websiteOrders.filter((order) => client.websiteOrderIds.includes(order.id));

  if (orders.length === 0) {
    return { label: "신규", tone: "info" };
  }

  const latest = [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  if (latest.status === "Delivered") return { label: "완료", tone: "success" };
  if (latest.status === "Cancelled") return { label: "취소", tone: "neutral" };
  return { label: "진행중", tone: "warning" };
}

type SortOption = "newest" | "oldest" | "name";

const SORT_LABELS: Record<SortOption, string> = {
  newest: "최신순",
  oldest: "오래된순",
  name: "회사명",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [websiteOrders, setWebsiteOrders] = useState<WebsiteOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    // 요구사항 — "기존 GET /api/clients만 사용한다"(고객사 목록 자체). 연결 개수(inquiryIds/
    // websiteOrderIds)는 ClientRecord에 이미 배열로 들어있어 추가 호출이 필요 없고, 상태 배지
    // 파생에만 기존 /api/website-orders(다른 도메인의 기존 API, 새 API 아님)를 함께 사용한다.
    Promise.all([
      fetch("/api/clients").then((res) => res.json() as Promise<ClientsResponse>),
      fetch("/api/website-orders").then((res) => res.json() as Promise<WebsiteOrdersResponse>),
    ])
      .then(([clientsJson, ordersJson]) => {
        setClients(clientsJson.clients ?? []);
        setWebsiteOrders(ordersJson.websiteOrders ?? []);
      })
      .catch(() => setLoadError("고객사 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const filteredAndSorted = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = normalizedQuery
      ? clients.filter((client) =>
          [client.companyName, client.contactName, client.email].some((field) =>
            field.toLowerCase().includes(normalizedQuery)
          )
        )
      : clients;

    const sorted = [...filtered];
    if (sortBy === "newest") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sortBy === "oldest") {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      sorted.sort((a, b) => (a.companyName || a.contactName).localeCompare(b.companyName || b.contactName));
    }

    return sorted;
  }, [clients, query, sortBy]);

  return (
    <div>
      <PageHeader
        icon="🏢"
        title="고객사 관리"
        description="AI 의뢰 파이프라인(Inquiry → Client)에서 자동 생성된 고객사 목록입니다. 새 Registry·API 없이 기존 lib/clients·GET /api/clients만 사용합니다."
        actions={
          <div className="flex items-center gap-4">
            <Link href="/developer/inquiries" className="text-xs text-blue-400 hover:underline self-center">
              AI 의뢰 관리 →
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
          placeholder="회사명·담당자·이메일 검색"
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
          {clients.length === 0 ? "등록된 고객사가 없습니다." : "검색 결과가 없습니다."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAndSorted.map((client) => {
            const status = deriveClientStatus(client, websiteOrders);
            return (
              <Link key={client.id} href={`/developer/clients/${client.id}`}>
                <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-600 transition-colors">
                  <Badge tone={status.tone} className="w-20 text-center shrink-0">
                    {status.label}
                  </Badge>

                  <span className="text-sm font-semibold text-white w-40 shrink-0 truncate">
                    {client.companyName || client.contactName}
                  </span>

                  <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{client.contactName}</span>

                  <span className="text-xs text-gray-400 w-48 shrink-0 truncate">{client.email}</span>

                  <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{client.phone || "-"}</span>

                  <span className="font-mono text-xs text-gray-500 w-32 shrink-0">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex gap-1.5 sm:ml-auto shrink-0">
                    <Badge tone="accent">Inquiry {client.inquiryIds.length}</Badge>
                    <Badge tone="purple">Order {client.websiteOrderIds.length}</Badge>
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
