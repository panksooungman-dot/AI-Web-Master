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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function handleDelete(e: React.MouseEvent, client: ClientRecord) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`"${client.companyName || client.contactName}" 고객사를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(client.id);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
      const data: { success: boolean; error?: string } = await res.json();

      if (!data.success) {
        setDeleteError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      setClients((prev) => prev.filter((item) => item.id !== client.id));
    } catch {
      setDeleteError("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        icon="🏢"
        title="고객사 관리"
        description="AI 의뢰 관리(Inquiry)에서 최초 문의 시 자동으로 생성·누적되는 고객사(Client) 목록입니다."
        help={[
          "이메일 기준으로 자동 생성되며, 수동으로 고객사를 새로 만들거나 정보를 수정하는 기능은 없습니다.",
        ]}
        actions={
          <button
            onClick={load}
            className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
          >
            Refresh
          </button>
        }
      />

      {deleteError && <StatusMessage tone="error" className="mb-4">{deleteError}</StatusMessage>}

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

                <button
                  onClick={(e) => handleDelete(e, client)}
                  disabled={deletingId === client.id}
                  className="shrink-0 rounded bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {deletingId === client.id ? "삭제 중..." : "삭제"}
                </button>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
