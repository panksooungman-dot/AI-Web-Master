"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { SpecificationRecord } from "@/lib/specifications/types";

interface SpecificationResponse {
  specification?: SpecificationRecord;
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

function toMarkdown(specification: SpecificationRecord): string {
  const { input, result } = specification;
  const lines = [
    `# 기능 명세서 — ${input.companyName}`,
    "",
    `- 업종: ${input.detectedBusinessType}`,
    `- 생성일: ${new Date(specification.createdAt).toLocaleString()}`,
    "",
    "## 프로젝트 개요",
    result.overview,
    "",
    "## 페이지 목록",
    ...result.pages.map((page) => `- **${page.name}** — ${page.description}`),
    "",
    "## 기능 목록",
    ...result.features.map((fn) => `- **${fn.name}**(${fn.priority}) — ${fn.description}`),
    "",
    "## 관리자 기능",
    ...result.adminFeatures.map((item) => `- ${item}`),
    "",
    "## API 목록",
    ...result.apis.map((api) => `- \`${api.method} ${api.path}\` — ${api.description}`),
    "",
    "## DB 개요",
    result.dbOverview,
    "",
    "## 개발 범위",
    ...result.scopeIncluded.map((item) => `- ${item}`),
    "",
    "## 제외 범위",
    ...result.scopeExcluded.map((item) => `- ${item}`),
    "",
    "## 기술 스택",
    ...result.techStack.map((item) => `- ${item}`),
    "",
    "## 산출물",
    ...result.deliverables.map((item) => `- ${item}`),
  ];
  return lines.join("\n");
}

const PRIORITY_TONE = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
} as const;

export default function SpecificationDetailPage() {
  const params = useParams<{ id: string }>();

  const [specification, setSpecification] = useState<SpecificationRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    fetch(`/api/specifications/${params.id}`)
      .then((res) => res.json())
      .then((data: SpecificationResponse) => {
        if (!data.specification) {
          setLoadError(data.error ?? "기능 명세서를 찾을 수 없습니다.");
          return;
        }
        setSpecification(data.specification);
      })
      .catch(() => setLoadError("기능 명세서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <LoadingText />;

  if (loadError || !specification) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "기능 명세서를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/specifications" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 기능 명세서 목록으로
        </Link>
      </div>
    );
  }

  const { input, result } = specification;

  return (
    <div>
      <Link href="/developer/specifications" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 기능 명세서 목록
      </Link>
      <Link
        href={`/developer/inquiries/${specification.inquiryId}`}
        className="ml-4 text-sm text-blue-400 hover:underline"
      >
        원본 의뢰 보기 →
      </Link>

      <PageHeader
        title={`기능 명세서 — ${input.companyName}`}
        description={`${input.detectedBusinessType} · ${new Date(specification.createdAt).toLocaleString()}`}
        actions={specification.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() =>
            downloadBlob(JSON.stringify(specification, null, 2), `specification-${specification.id}.json`, "application/json")
          }
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(specification), `specification-${specification.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
      </div>

      <Card title="프로젝트 개요" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.overview}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="페이지 목록">
          <div className="flex flex-col gap-2">
            {result.pages.map((page, i) => (
              <div key={i} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
                <p className="font-semibold text-gray-200 text-sm">{page.name}</p>
                <p className="text-xs text-gray-400">{page.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="기능 목록">
          <div className="flex flex-col gap-2">
            {result.features.map((fn, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
              >
                <span className="font-semibold text-gray-200 text-sm sm:w-32 shrink-0">{fn.name}</span>
                <span className="text-xs text-gray-400 flex-1">{fn.description}</span>
                <Badge tone={PRIORITY_TONE[fn.priority]}>{fn.priority}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="관리자 기능">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.adminFeatures.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card title="API 목록">
          <div className="flex flex-col gap-2">
            {result.apis.map((api, i) => (
              <div
                key={i}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded border border-gray-800 bg-gray-950 px-3 py-2"
              >
                <Badge tone="accent" className="shrink-0">
                  {api.method}
                </Badge>
                <span className="font-mono text-xs text-gray-300">{api.path}</span>
                <span className="text-xs text-gray-400 sm:ml-auto">{api.description}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="DB 개요" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.dbOverview}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="개발 범위">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.scopeIncluded.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card title="제외 범위">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.scopeExcluded.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="기술 스택">
          <div className="flex flex-wrap gap-1.5">
            {result.techStack.map((item) => (
              <Badge key={item} tone="info">
                {item}
              </Badge>
            ))}
          </div>
        </Card>

        <Card title="산출물">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.deliverables.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
