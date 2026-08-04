"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CustomerOrderDetail } from "@/lib/customerPortal/view";
import {
  ORDER_STATUS_LABELS,
  DEPLOYMENT_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  WORKFLOW_STATUS_LABELS,
} from "@/components/customer/labels";

interface OrderResponse {
  success: boolean;
  order?: CustomerOrderDetail;
  error?: string;
}

function downloadBlob(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="mb-4 text-base font-bold text-zinc-900">{title}</h2>
      {children}
    </section>
  );
}

function DownloadButton({ label, filename, data }: { label: string; filename: string; data: unknown }) {
  return (
    <button
      onClick={() => downloadBlob(JSON.stringify(data, null, 2), filename)}
      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
    >
      {label} 다운로드
    </button>
  );
}

export default function CustomerOrderDetailPage() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    fetch(`/api/customer/orders/${params.id}`)
      .then((res) => res.json())
      .then((data: OrderResponse) => {
        if (!data.success || !data.order) {
          setLoadError(data.error ?? "프로젝트를 찾을 수 없습니다.");
          return;
        }
        setOrder(data.order);
      })
      .catch(() => setLoadError("프로젝트 정보를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <p className="text-sm text-zinc-500">불러오는 중...</p>;

  if (loadError || !order) {
    return (
      <div>
        <p className="text-sm text-red-600">{loadError ?? "프로젝트를 찾을 수 없습니다."}</p>
        <Link href="/customer/orders" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
          ← 내 프로젝트 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/customer/orders" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900">
        ← 내 프로젝트 목록
      </Link>

      <div className="mb-8 mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{order.companyName}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            접수일: {new Date(order.createdAt).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-4 py-1.5 text-sm font-semibold text-zinc-700">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <Section title="문의 내용">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">담당자</dt>
            <dd className="text-zinc-900">{order.contactName}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">사이트 유형</dt>
            <dd className="text-zinc-900">{order.siteType}</dd>
          </div>
        </dl>
        {order.requirements && (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-700">{order.requirements}</p>
        )}
      </Section>

      {(order.projectStatus || order.workflowStatus) && (
        <Section title="진행 상태">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {order.projectStatus && (
              <div>
                <dt className="text-zinc-500">프로젝트 상태</dt>
                <dd className="text-zinc-900">{PROJECT_STATUS_LABELS[order.projectStatus]}</dd>
              </div>
            )}
            {order.workflowStatus && (
              <div>
                <dt className="text-zinc-500">작업 실행 상태</dt>
                <dd className="text-zinc-900">{WORKFLOW_STATUS_LABELS[order.workflowStatus]}</dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      <Section title="AI 분석">
        {!order.hasAnalysis || !order.analysis ? (
          <p className="text-sm text-zinc-500">아직 분석이 완료되지 않았습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-4">
              <div>
                <p className="text-zinc-500">업종 분류</p>
                <p className="font-semibold text-zinc-900">{order.analysis.detectedBusinessType}</p>
              </div>
              <div>
                <p className="text-zinc-500">완성도</p>
                <p className="font-semibold text-zinc-900">{order.analysis.completeness}점</p>
              </div>
            </div>
            <p className="text-zinc-700">{order.analysis.summary}</p>
            {order.analysis.missingItems.length > 0 && (
              <div>
                <p className="mb-1 text-zinc-500">추가로 필요한 자료</p>
                <ul className="list-disc list-inside text-zinc-700">
                  {order.analysis.missingItems.map((item) => (
                    <li key={item.id}>{item.title}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>

      <Section title="기술 견적서">
        {!order.estimate ? (
          <p className="text-sm text-zinc-500">아직 생성되지 않았습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-lg font-bold text-zinc-900">
              {order.estimate.result.priceRangeMin.toLocaleString()} ~{" "}
              {order.estimate.result.priceRangeMax.toLocaleString()} {order.estimate.result.currency}
            </p>
            <p className="text-zinc-500">예상 소요 기간: {order.estimate.result.timelineWeeks}주</p>
            <p className="text-zinc-700">{order.estimate.result.summary}</p>
            <div>
              <DownloadButton label="견적서" filename={`estimate-${order.estimate.id}.json`} data={order.estimate} />
            </div>
          </div>
        )}
      </Section>

      <Section title="기능 명세서">
        {!order.specification ? (
          <p className="text-sm text-zinc-500">아직 생성되지 않았습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-zinc-700">{order.specification.result.overview}</p>
            <p className="text-zinc-500">
              페이지 {order.specification.result.pages.length}종 · 기능 {order.specification.result.features.length}종
            </p>
            <div>
              <DownloadButton
                label="명세서"
                filename={`specification-${order.specification.id}.json`}
                data={order.specification}
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="프로젝트 일정">
        {!order.timeline ? (
          <p className="text-sm text-zinc-500">아직 생성되지 않았습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-lg font-bold text-zinc-900">
              총 {order.timeline.result.totalDurationWeeks}주 ({order.timeline.result.totalDurationDays}일)
            </p>
            <p className="text-zinc-700">{order.timeline.result.overview}</p>
            <div>
              <DownloadButton label="일정표" filename={`timeline-${order.timeline.id}.json`} data={order.timeline} />
            </div>
          </div>
        )}
      </Section>

      <Section title="계약서">
        {!order.contract ? (
          <p className="text-sm text-zinc-500">아직 생성되지 않았습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="font-semibold text-zinc-900">{order.contract.result.title}</p>
            <p className="text-lg font-bold text-zinc-900">
              {order.contract.result.contractAmount.amount.toLocaleString()} {order.contract.result.contractAmount.currency}
            </p>
            <p className="text-zinc-700">{order.contract.result.schedule}</p>
            <div>
              <DownloadButton label="계약서" filename={`contract-${order.contract.id}.json`} data={order.contract} />
            </div>
          </div>
        )}
      </Section>

      <Section title="제안서">
        {!order.proposal ? (
          <p className="text-sm text-zinc-500">아직 생성되지 않았습니다.</p>
        ) : (
          <div className="flex flex-col gap-3 text-sm">
            <p className="font-semibold text-zinc-900">{order.proposal.result.title}</p>
            <p className="text-zinc-700">{order.proposal.result.executiveSummary}</p>
            <div>
              <DownloadButton label="제안서" filename={`proposal-${order.proposal.id}.json`} data={order.proposal} />
            </div>
          </div>
        )}
      </Section>

      <Section title="배포">
        {!order.deploymentStatus || order.deploymentStatus === "NotStarted" ? (
          <p className="text-sm text-zinc-500">아직 배포 전입니다.</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-700">
              상태: <span className="font-semibold text-zinc-900">{DEPLOYMENT_STATUS_LABELS[order.deploymentStatus]}</span>
            </p>
            {order.deploymentUrl && (
              <a
                href={order.deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-fit rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                사이트 방문하기 →
              </a>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}
