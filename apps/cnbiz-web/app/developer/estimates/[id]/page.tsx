"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { EstimateRecord } from "@/lib/estimates/types";

interface EstimateResponse {
  estimate?: EstimateRecord;
  error?: string;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(estimate: EstimateRecord): string {
  const { input, result } = estimate;
  const lines = [
    `# 기술 견적서 — ${input.companyName}`,
    "",
    `- 업종: ${input.detectedBusinessType}`,
    `- 예상 가격 범위: ${result.priceRangeMin.toLocaleString()} ~ ${result.priceRangeMax.toLocaleString()} ${result.currency}`,
    `- 예상 소요 기간: ${result.timelineWeeks}주`,
    `- 생성일: ${new Date(estimate.createdAt).toLocaleString()}`,
    "",
    "## 요약",
    result.summary,
    "",
    "## 항목별 산정",
    ...result.lineItems.map((item) => `- **${item.name}**(${item.estimatedHours}h) — ${item.description}`),
    "",
    "## 가정 사항",
    ...result.assumptions.map((a) => `- ${a}`),
  ];
  return lines.join("\n");
}

export default function EstimateDetailPage() {
  const params = useParams<{ id: string }>();

  const [estimate, setEstimate] = useState<EstimateRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    fetch(`/api/estimates/${params.id}`)
      .then((res) => res.json())
      .then((data: EstimateResponse) => {
        if (!data.estimate) {
          setLoadError(data.error ?? "견적서를 찾을 수 없습니다.");
          return;
        }
        setEstimate(data.estimate);
      })
      .catch(() => setLoadError("견적서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <LoadingText />;

  if (loadError || !estimate) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "견적서를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/estimates" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 견적서 목록으로
        </Link>
      </div>
    );
  }

  const { input, result } = estimate;

  return (
    <div>
      <Link href="/developer/estimates" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 견적서 목록
      </Link>
      <Link
        href={`/developer/inquiries/${estimate.inquiryId}`}
        className="ml-4 text-sm text-blue-400 hover:underline"
      >
        원본 의뢰 보기 →
      </Link>

      <PageHeader
        title={`기술 견적서 — ${input.companyName}`}
        description={`${input.detectedBusinessType} · ${new Date(estimate.createdAt).toLocaleString()}`}
        actions={estimate.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => downloadBlob(JSON.stringify(estimate, null, 2), `estimate-${estimate.id}.json`, "application/json")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(estimate), `estimate-${estimate.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card title="예상 가격">
          <p className="text-2xl font-bold text-gray-100">
            {result.priceRangeMin.toLocaleString()} ~ {result.priceRangeMax.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">{result.currency}</p>
        </Card>
        <Card title="예상 소요 기간">
          <p className="text-2xl font-bold text-gray-100">{result.timelineWeeks}주</p>
        </Card>
        <Card title="총 산정 시간">
          <p className="text-2xl font-bold text-gray-100">
            {result.lineItems.reduce((sum, item) => sum + item.estimatedHours, 0)}h
          </p>
        </Card>
      </div>

      <Card title="요약" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.summary}</p>
      </Card>

      <Card title="항목별 산정" className="mb-6">
        <div className="flex flex-col gap-2">
          {result.lineItems.map((item, i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
            >
              <span className="font-semibold text-gray-200 sm:w-40 shrink-0">{item.name}</span>
              <span className="text-xs text-gray-400 flex-1">{item.description}</span>
              <Badge tone="accent">{item.estimatedHours}h</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card title="가정 사항">
        <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
          {result.assumptions.map((assumption, i) => (
            <li key={i}>{assumption}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
