"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, type BadgeTone } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { WebsiteOrderRecord, WebsiteOrderStatus } from "@/lib/websiteOrders/types";

interface WebsiteOrdersResponse {
  websiteOrders: WebsiteOrderRecord[];
}

const STATUS_LABELS: Record<WebsiteOrderStatus, string> = {
  Requested: "접수",
  InProgress: "처리중",
  Review: "검수",
  Delivered: "납품완료",
  Cancelled: "취소",
};

const STATUS_TONES: Record<WebsiteOrderStatus, BadgeTone> = {
  Requested: "info",
  InProgress: "warning",
  Review: "purple",
  Delivered: "success",
  Cancelled: "danger",
};

const FILTERS: ("All" | WebsiteOrderStatus)[] = ["All", "Requested", "InProgress", "Review", "Delivered", "Cancelled"];

export default function WebsiteOrdersPage() {
  const [orders, setOrders] = useState<WebsiteOrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"All" | WebsiteOrderStatus>("All");

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/website-orders")
      .then((res) => res.json())
      .then((json: WebsiteOrdersResponse) => setOrders(json.websiteOrders ?? []))
      .catch(() => setLoadError("주문 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  const filtered = filter === "All" ? orders : orders.filter((order) => order.status === filter);

  return (
    <div>
      <PageHeader
        icon="🧾"
        title="웹사이트 제작 주문 관리"
        description="AI 의뢰(Inquiry)가 전환되어 생성된 웹사이트 제작 주문(WebsiteOrder) 목록입니다."
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
        <p className="text-gray-500">등록된 주문이 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((order) => (
            <Link key={order.id} href={`/developer/website-orders/${order.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(order.createdAt).toLocaleString()}
                </span>

                <Badge tone={STATUS_TONES[order.status]} className="w-20 text-center">
                  {STATUS_LABELS[order.status]}
                </Badge>

                <span className="text-sm font-semibold text-white w-40 shrink-0 truncate">{order.name}</span>

                <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{order.siteType}</span>

                <p className="flex-1 text-sm text-gray-300 truncate">{order.requirements}</p>

                <Badge tone="accent">AI Job {order.aiJobIds.length}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
