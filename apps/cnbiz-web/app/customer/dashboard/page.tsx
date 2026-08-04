"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { OrderCard } from "@/components/customer/OrderCard";
import type { CustomerOrderSummary } from "@/lib/customerPortal/view";

interface OrdersResponse {
  success: boolean;
  orders?: CustomerOrderSummary[];
  error?: string;
}

/**
 * Customer Portal V1 대시보드 — GET /api/customer/orders 하나로 목록/대시보드 둘 다 구성한다
 * (별도 API를 새로 만들지 않는다, 이 화면은 최근 몇 건만 요약해서 보여주고 전체는
 * /customer/orders로 안내).
 */
export default function CustomerDashboardPage() {
  const { user } = useAuth();
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

  const recentOrders = orders.slice(0, 3);
  const deployedCount = orders.filter((order) => order.deploymentStatus === "Success").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          안녕하세요{user?.email ? `, ${user.email}` : ""}님
        </h1>
        <p className="mt-1 text-sm text-zinc-500">현재 진행 중인 프로젝트 현황을 한눈에 확인하세요.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-500">불러오는 중...</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-sm text-zinc-500">아직 등록된 프로젝트가 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-500">전체 프로젝트</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900">{orders.length}건</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-500">배포 완료</p>
              <p className="mt-1 text-3xl font-bold text-zinc-900">{deployedCount}건</p>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-zinc-900">최근 프로젝트</h2>
            <Link href="/customer/orders" className="text-sm font-semibold text-blue-600 hover:underline">
              전체 보기 →
            </Link>
          </div>

          <div className="flex flex-col gap-4">
            {recentOrders.map((order) => (
              <OrderCard key={order.websiteOrderId} order={order} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
