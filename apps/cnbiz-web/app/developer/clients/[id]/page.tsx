"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ClientRecord } from "@/lib/clients/types";
import type { WebsiteOrderRecord } from "@/lib/websiteOrders/types";

interface ClientResponse {
  client?: ClientRecord;
  error?: string;
}

interface ClientUpdateResponse {
  success: boolean;
  client?: ClientRecord;
  error?: string;
}

const EMPTY_FORM = { companyName: "", contactName: "", email: "", phone: "" };

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();

  const [client, setClient] = useState<ClientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // '주문 관리'(구 /developer/website-orders) 화면이 없어져 주문 상세는 이제 그 주문의
  // 원본 의뢰(Inquiry) 상세로 연결한다 — orderId만으로는 inquiryId를 알 수 없어 각 주문을
  // 개별 조회해 매핑을 만든다.
  const [orderInquiryMap, setOrderInquiryMap] = useState<Record<string, string>>({});

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

        Promise.all(
          data.client.websiteOrderIds.map((orderId) =>
            fetch(`/api/website-orders/${orderId}`)
              .then((res) => res.json())
              .then((orderData: { websiteOrder?: WebsiteOrderRecord }) =>
                orderData.websiteOrder ? ([orderId, orderData.websiteOrder.inquiryId] as const) : null
              )
              .catch(() => null)
          )
        ).then((pairs) => {
          const map: Record<string, string> = {};
          for (const pair of pairs) {
            if (pair) map[pair[0]] = pair[1];
          }
          setOrderInquiryMap(map);
        });
      })
      .catch(() => setLoadError("고객사를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function startEditing() {
    if (!client) return;
    setForm({
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
    });
    setSaveError(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setSaveError(null);
  }

  async function saveEditing() {
    if (!client) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: ClientUpdateResponse = await res.json();

      if (!data.success || !data.client) {
        setSaveError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setClient(data.client);
      setIsEditing(false);
    } catch {
      setSaveError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

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
        <Card
          title="연락처 정보"
          className="lg:col-span-1"
          actions={
            !isEditing && (
              <button
                type="button"
                onClick={startEditing}
                className="text-xs text-blue-400 hover:underline"
              >
                정보 수정
              </button>
            )
          }
        >
          {isEditing ? (
            <div className="flex flex-col gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-gray-500">회사명</span>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500">담당자</span>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500">이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-500">연락처</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="010-1234-5678"
                  className="rounded border border-gray-700 bg-gray-950 px-3 py-2 text-gray-200"
                />
              </label>

              {saveError && <StatusMessage tone="error">{saveError}</StatusMessage>}

              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={saveEditing}
                  disabled={isSaving}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {isSaving ? "저장 중..." : "저장"}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="rounded border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:border-gray-500 disabled:opacity-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-gray-500">회사명</dt>
                <dd className="text-gray-200">{client.companyName}</dd>
              </div>
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
                <dd className="text-gray-200">{client.phone || "(미기재)"}</dd>
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
          )}
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
              {client.websiteOrderIds.map((orderId) => {
                const inquiryId = orderInquiryMap[orderId];

                return (
                  <Link
                    key={orderId}
                    href={inquiryId ? `/developer/inquiries/${inquiryId}` : "#"}
                    aria-disabled={!inquiryId}
                    className={`flex items-center justify-between rounded border border-gray-800 bg-gray-950 px-3 py-2 text-sm transition-colors ${
                      inquiryId ? "hover:border-blue-600" : "pointer-events-none opacity-50"
                    }`}
                  >
                    <span className="font-mono text-xs text-gray-400 truncate">{orderId}</span>
                    <Badge tone="accent">의뢰에서 보기 →</Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
