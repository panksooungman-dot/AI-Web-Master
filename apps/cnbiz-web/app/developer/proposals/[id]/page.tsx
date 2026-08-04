"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ProposalRecord } from "@/lib/proposals/types";

interface ProposalResponse {
  proposal?: ProposalRecord;
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

function toMarkdown(proposal: ProposalRecord): string {
  const { result } = proposal;
  const lines = [
    `# ${result.title}`,
    "",
    `- 프로젝트 비용: ${result.cost.amount.toLocaleString()} ${result.cost.currency}`,
    `- 생성일: ${new Date(proposal.createdAt).toLocaleString()}`,
    "",
    "## Executive Summary",
    result.executiveSummary,
    "",
    "## 프로젝트 개요",
    result.overview,
    "",
    "## 고객 요구사항 분석",
    result.requirementsAnalysis,
    "",
    "## 제안 목표",
    ...result.objectives.map((item) => `- ${item}`),
    "",
    "## 솔루션 개요",
    result.solutionOverview,
    "",
    "## 페이지 구성",
    ...result.pages.map((page) => `- **${page.name}** — ${page.description}`),
    "",
    "## 주요 기능",
    ...result.features.map((feature) => `- **${feature.name}** — ${feature.description}`),
    "",
    "## 기술 스택",
    ...result.techStack.map((item) => `- ${item}`),
    "",
    "## 프로젝트 일정",
    result.schedule,
    "",
    "## 프로젝트 비용",
    `${result.cost.amount.toLocaleString()} ${result.cost.currency} — ${result.cost.description}`,
    "",
    "## 개발 범위",
    ...result.developmentScope.map((item) => `- ${item}`),
    "",
    "## 산출물",
    ...result.deliverables.map((item) => `- ${item}`),
    "",
    "## 유지보수 계획",
    result.maintenancePlan,
    "",
    "## 프로젝트 기대 효과",
    ...result.expectedBenefits.map((item) => `- ${item}`),
    "",
    "## 회사 소개",
    result.companyIntroduction,
    "",
    "## 문의 정보",
    result.contactInfo,
  ];
  return lines.join("\n");
}

export default function ProposalDetailPage() {
  const params = useParams<{ id: string }>();

  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setIsLoading(true);
      setLoadError(null);
    });

    fetch(`/api/proposals/${params.id}`)
      .then((res) => res.json())
      .then((data: ProposalResponse) => {
        if (!data.proposal) {
          setLoadError(data.error ?? "제안서를 찾을 수 없습니다.");
          return;
        }
        setProposal(data.proposal);
      })
      .catch(() => setLoadError("제안서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  if (isLoading) return <LoadingText />;

  if (loadError || !proposal) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "제안서를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/proposals" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 제안서 목록으로
        </Link>
      </div>
    );
  }

  const { result } = proposal;

  return (
    <div>
      <Link href="/developer/proposals" className="text-sm text-gray-400 hover:text-white transition-colors">
        ← 제안서 목록
      </Link>
      <Link href={`/developer/inquiries/${proposal.inquiryId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        원본 의뢰 보기 →
      </Link>
      <Link href={`/developer/estimates/${proposal.estimateId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        기술 견적서 보기 →
      </Link>
      <Link href={`/developer/specifications/${proposal.specificationId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        기능 명세서 보기 →
      </Link>
      <Link href={`/developer/timeline/${proposal.timelineId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        프로젝트 일정 보기 →
      </Link>
      <Link href={`/developer/contracts/${proposal.contractId}`} className="ml-4 text-sm text-blue-400 hover:underline">
        계약서 보기 →
      </Link>

      <PageHeader
        title={result.title}
        description={new Date(proposal.createdAt).toLocaleString()}
        actions={proposal.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => downloadBlob(JSON.stringify(proposal, null, 2), `proposal-${proposal.id}.json`, "application/json")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(proposal), `proposal-${proposal.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
      </div>

      <Card title="Executive Summary" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.executiveSummary}</p>
      </Card>

      <Card title="프로젝트 개요" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.overview}</p>
      </Card>

      <Card title="고객 요구사항 분석" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.requirementsAnalysis}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="제안 목표">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.objectives.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title="솔루션 개요">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.solutionOverview}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="페이지 구성">
          <div className="flex flex-col gap-2">
            {result.pages.map((page, i) => (
              <div key={i} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
                <p className="font-semibold text-gray-200 text-sm">{page.name}</p>
                <p className="text-xs text-gray-400">{page.description}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="주요 기능">
          <div className="flex flex-col gap-2">
            {result.features.map((feature, i) => (
              <div key={i} className="rounded border border-gray-800 bg-gray-950 px-3 py-2">
                <p className="font-semibold text-gray-200 text-sm">{feature.name}</p>
                <p className="text-xs text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="기술 스택" className="mb-6">
        <div className="flex flex-wrap gap-1.5">
          {result.techStack.map((item) => (
            <Badge key={item} tone="info">
              {item}
            </Badge>
          ))}
        </div>
      </Card>

      <Card title="프로젝트 일정" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.schedule}</p>
      </Card>

      <Card title="프로젝트 비용" className="mb-6">
        <p className="text-2xl font-bold text-gray-100">
          {result.cost.amount.toLocaleString()} {result.cost.currency}
        </p>
        <p className="text-sm text-gray-500 mt-1">{result.cost.description}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card title="개발 범위">
          <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
            {result.developmentScope.map((item, i) => (
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

      <Card title="유지보수 계획" className="mb-6">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.maintenancePlan}</p>
      </Card>

      <Card title="프로젝트 기대 효과" className="mb-6">
        <ul className="list-disc list-inside text-sm text-gray-300 flex flex-col gap-1">
          {result.expectedBenefits.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="회사 소개">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.companyIntroduction}</p>
        </Card>
        <Card title="문의 정보">
          <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.contactInfo}</p>
        </Card>
      </div>
    </div>
  );
}
