"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ClientRecord } from "@/lib/clients/types";

interface ClientResponse {
  client?: ClientRecord;
  error?: string;
}

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch(`/api/clients/${params.id}`)
      .then((res) => res.json())
      .then((data: ClientResponse) => {
        if (!data.client) {
          setLoadError(data.error ?? "고객사를 찾을 수 없습니다.");
          return;
        }
        setClient(data.client);
      })
      .catch(() => setLoadError("고객사를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  if (isLoading) {
    return <LoadingText />;
  }

  if (loadError || !client) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "고객사를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/clients" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 고객사 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/developer/clients" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 고객사 목록
      </Link>

      <PageHeader title={client.companyName} description={`${client.contactName} · ${client.email}`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="연락처 정보" className="lg:col-span-1">
          <dl className="flex flex-col gap-3 text-sm">
            <div>
              <dt className="text-gray-500">담당자</dt>
              <dd className="text-gray-200">{client.contactName}</dd>
            </div>
            <div>
              <dt className="text-gray-500">이메일</dt>
              <dd className="text-gray-200">{client.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">연락처</dt>
              <dd className="text-gray-200">{client.phone}</dd>
            </div>
            <div>
              <dt className="text-gray-500">최초 등록일</dt>
              <dd className="text-gray-200">{new Date(client.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-gray-500">최근 갱신일</dt>
              <dd className="text-gray-200">{new Date(client.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        </Card>

        <Card title="연결된 문의(Inquiry)" className="lg:col-span-1">
          {client.inquiryIds.length === 0 ? (
            <p className="text-sm text-gray-500">연결된 문의가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {client.inquiryIds.map((inquiryId) => (
                <Link
                  key={inquiryId}
                  href={`/developer/inquiries/${inquiryId}`}
                  className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm hover:border-blue-600 transition-colors"
                >
                  <span className="font-mono text-xs text-gray-400 truncate">{inquiryId}</span>
                  <Badge tone="info">보기 →</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="연결된 주문(WebsiteOrder)" className="lg:col-span-1">
          {client.websiteOrderIds.length === 0 ? (
            <p className="text-sm text-gray-500">연결된 주문이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {client.websiteOrderIds.map((orderId) => (
                <Link
                  key={orderId}
                  href={`/developer/website-orders/${orderId}`}
                  className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm hover:border-blue-600 transition-colors"
                >
                  <span className="font-mono text-xs text-gray-400 truncate">{orderId}</span>
                  <Badge tone="accent">보기 →</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
