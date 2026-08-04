"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ContractRecord } from "@/lib/contracts/types";

interface ContractResponse {
  contract?: ContractRecord;
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

function toMarkdown(contract: ContractRecord): string {
  const { result } = contract;
  const lines = [
    `# ${result.title}`,
    "",
    `- 계약 금액: ${result.contractAmount.amount.toLocaleString()} ${result.contractAmount.currency}${result.contractAmount.vatIncluded ? " (VAT 포함)" : " (VAT 별도)"}`,
    `- 생성일: ${new Date(contract.createdAt).toLocaleString()}`,
    "",
    "## 프로젝트 개요",
    result.overview,
    "",
    "## 계약 목적",
    result.purpose,
    "",
    "## 개발 범위",
    ...result.developmentScope.map((item) => `- ${item}`),
    "",
    "## 제외 범위",
    ...result.excludedScope.map((item) => `- ${item}`),
    "",
    "## 개발 일정",
    result.schedule,
    "",
    "## 결제 조건",
    ...result.paymentTerms.map((item) => `- ${item}`),
    "",
    "## 산출물",
    ...result.deliverables.map((item) => `- ${item}`),
    "",
    "## 검수 조건",
    ...result.acceptanceCriteria.map((item) => `- ${item}`),
    "",
    "## 유지보수",
    result.maintenance,
    "",
    "## 변경 요청 규정",
    result.changeRequestPolicy,
    "",
    "## 계약 해지 조건",
    result.terminationClause,
    "",
    "## 저작권",
    result.intellectualProperty,
    "",
    "## 비밀유지",
    result.confidentiality,
    "",
    "## 기타 특약",
    ...(result.specialTerms.length > 0 ? result.specialTerms.map((item) => `- ${item}`) : ["- 없음"]),
  ];
  return lines.join("\n");
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();

  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    fetch(`/api/contracts/${params.id}`)
      .then((res) => res.json())
      .then((data: ContractResponse) => {
        if (!data.contract) {
          setLoadError(data.error ?? "계약서를 찾을 수 없습니다.");
          return;
        }
        setContract(data.contract);
      })
      .catch(() => setLoadError("계약서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <LoadingText />;

  if (loadError || !contract) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "계약서를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/contracts" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 계약서 목록으로
        </Link>
      </div>
    );
  }

  const { result } = contract;

  return (
    <div>
      <Link href="/developer/contracts" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 계약서 목록
      </Link>
      <Link href={`/developer/inquiries/${contract.inquiryId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        원본 의뢰 보기 →
      </Link>
      <Link href={`/developer/estimates/${contract.estimateId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        기술 견적서 보기 →
      </Link>
      <Link href={`/developer/specifications/${contract.specificationId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        기능 명세서 보기 →
      </Link>
      <Link href={`/developer/timeline/${contract.timelineId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        프로젝트 일정 보기 →
      </Link>

      <PageHeader
        title={result.title}
        description={new Date(contract.createdAt).toLocaleString()}
        actions={contract.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => downloadBlob(JSON.stringify(contract, null, 2), `contract-${contract.id}.json`, "application/json")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(contract), `contract-${contract.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
      </div>

      <Card title="계약 금액" className="mb-6">
        <p className="text-2xl font-bold text-gray-100">
          {result.contractAmount.amount.toLocaleString()} {result.contractAmount.currency}
        </p>
        <p className="text-sm text-gray-500">{result.contractAmount.vatIncluded ? "VAT 포함" : "VAT 별도"}</p>
      </Card>

      <Card title="프로젝트 개요" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.overview}</p>
      </Card>

      <Card title="계약 목적" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.purpose}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="개발 범위">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.developmentScope.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card title="제외 범위">
          {result.excludedScope.length === 0 ? (
            <p className="text-sm text-gray-500">없음</p>
          ) : (
            <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
              {result.excludedScope.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="개발 일정" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.schedule}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="결제 조건">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.paymentTerms.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card title="산출물">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.deliverables.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="검수 조건" className="mb-6">
        <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
          {result.acceptanceCriteria.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="유지보수">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.maintenance}</p>
        </Card>
        <Card title="변경 요청 규정">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.changeRequestPolicy}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="계약 해지 조건">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.terminationClause}</p>
        </Card>
        <Card title="저작권">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.intellectualProperty}</p>
        </Card>
      </div>

      <Card title="비밀유지" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.confidentiality}</p>
      </Card>

      <Card title="기타 특약">
        {result.specialTerms.length === 0 ? (
          <p className="text-sm text-gray-500">없음</p>
        ) : (
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.specialTerms.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
