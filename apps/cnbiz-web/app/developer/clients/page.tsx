"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ClientRecord } from "@/lib/clients/types";

interface ClientsResponse {
  clients: ClientRecord[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/clients")
      .then((res) => res.json())
      .then((json: ClientsResponse) => setClients(json.clients ?? []))
      .catch(() => setLoadError("고객사 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="🏢"
        title="고객사 관리"
        description="AI 의뢰 관리(Inquiry)에서 최초 문의 시 자동으로 생성·누적되는 고객사(Client) 목록입니다."
        actions={
          <button
            onClick={load}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : clients.length === 0 ? (
        <p className="text-gray-500">등록된 고객사가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((client) => (
            <Link key={client.id} href={`/developer/clients/${client.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-blue-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(client.createdAt).toLocaleString()}
                </span>

                <span className="text-sm font-semibold text-white w-40 shrink-0 truncate">
                  {client.companyName}
                </span>

                <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{client.contactName}</span>

                <span className="text-xs text-gray-400 flex-1 truncate">{client.email}</span>

                <Badge tone="info">문의 {client.inquiryIds.length}</Badge>
                <Badge tone="accent">주문 {client.websiteOrderIds.length}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
