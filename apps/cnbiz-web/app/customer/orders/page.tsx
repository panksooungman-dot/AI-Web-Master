"use client";

import { useEffect, useState } from "react";
import { OrderCard } from "@/components/customer/OrderCard";
import type { CustomerOrderSummary } from "@/lib/customerPortal/view";

interface OrdersResponse {
  success: boolean;
  orders?: CustomerOrderSummary[];
  error?: string;
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/customer/orders")
        .then((res) => res.json())
        .then((data: OrdersResponse) => {
          if (!data.success) {
            setLoadError(data.error ?? "주문 정보를 불러오지 못했습니다.");
            return;
          }
          setOrders(data.orders ?? []);
        })
        .catch(() => setLoadError("주문 정보를 불러오지 못했습니다."))
        .finally(() => setIsLoading(false));
    });
  }, []);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold tracking-tight text-zinc-900">내 프로젝트</h1>

      {isLoading ? (
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">아직 등록된 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard key={order.websiteOrderId} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
