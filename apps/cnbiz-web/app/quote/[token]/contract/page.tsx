"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import type { ContractRecord } from "@/lib/contracts/types";
import type { ProposalRecord } from "@/lib/proposals/types";
import { componentMarker } from "@/lib/dev/component-marker";
import { DocumentWatermark } from "@/components/DocumentWatermark";
import { QuoteDocumentTabs } from "@/components/quote/QuoteDocumentTabs";

interface PublicQuoteResponse {
  companyName?: string;
  estimate?: EstimateRecord | null;
  specification?: SpecificationRecord | null;
  timeline?: TimelineRecord | null;
  contract?: ContractRecord | null;
  proposal?: ProposalRecord | null;
  error?: string;
}

/**
 * 계약서만 단독으로 출력하는 페이지 — `/quote/[token]`의 탭으로 진입한다.
 * 같은 공개 조회 API(`/api/quote/public/[token]`)를 그대로 재사용하고 contract 필드만
 * 렌더링한다. `/quote/` prefix라 SiteChrome이 이 페이지도 자동으로 헤더·푸터 없이 보여준다.
 */
export default function PublicContractPage() {
  const params = useParams<{ token: string }>();

  const [data, setData] = useState<PublicQuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quote/public/${params.token}`)
      .then((res) => res.json())
      .then((json: PublicQuoteResponse) => {
        if (json.error) {
          setLoadError(json.error);
          return;
        }
        setData(json);
      })
      .catch(() => setLoadError("문서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.token]);

  if (isLoading) {
    return (
      <Section background="white">
        <Container className="max-w-3xl py-12 text-center text-slate-500">불러오는 중입니다...</Container>
      </Section>
    );
  }

  if (loadError || !data || !data.contract) {
    return (
      <Section background="white">
        <Container className="max-w-3xl">
          <QuoteDocumentTabs
            token={params.token}
            hasEstimate={Boolean(data?.estimate)}
            hasSpecification={Boolean(data?.specification)}
            hasTimeline={Boolean(data?.timeline)}
            hasContract={Boolean(data?.contract)}
            hasProposal={Boolean(data?.proposal)}
          />
          <p className="py-12 text-center text-slate-500">{loadError ?? "계약서를 찾을 수 없습니다."}</p>
        </Container>
      </Section>
    );
  }

  const { companyName, contract } = data;
  const { result } = contract;

  return (
    <Section
      background="white"
      {...componentMarker("PublicContractPage", "app/quote/[token]/contract/page.tsx", "의뢰자 공개 계약서")}
    >
      <Container className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">PROJECT DOCUMENTS</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{companyName} 프로젝트 문서</h1>

        <QuoteDocumentTabs
          token={params.token}
          hasEstimate={Boolean(data.estimate)}
          hasSpecification={Boolean(data.specification)}
          hasTimeline={Boolean(data.timeline)}
          hasContract={Boolean(data.contract)}
          hasProposal={Boolean(data.proposal)}
        />

        <Card className="relative isolate mt-8 overflow-hidden">
          <DocumentWatermark />
          <h2 className="text-xl font-bold text-slate-900 text-center border-b border-slate-200 pb-4 mb-4">
            {result.title}
          </h2>

          <div className="rounded border-l-4 border-primary bg-blue-50 px-4 py-3 mb-6">
            <p className="text-xl font-bold text-slate-900">
              {result.contractAmount.amount.toLocaleString()} {result.contractAmount.currency}
              <span className="ml-2 text-sm font-normal text-slate-600">
                ({result.contractAmount.vatIncluded ? "VAT 포함" : "VAT 별도"})
              </span>
            </p>
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-1">프로젝트 개요</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{result.overview}</p>

          <p className="text-sm font-semibold text-slate-700 mb-1">계약 목적</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{result.purpose}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">개발 범위</p>
              <ul className="list-disc list-inside text-sm text-slate-600 flex flex-col gap-1">
                {result.developmentScope.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">제외 범위</p>
              {result.excludedScope.length === 0 ? (
                <p className="text-sm text-slate-400">없음</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-slate-600 flex flex-col gap-1">
                  {result.excludedScope.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-1">개발 일정</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{result.schedule}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">결제 조건</p>
              <ul className="list-disc list-inside text-sm text-slate-600 flex flex-col gap-1">
                {result.paymentTerms.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">산출물</p>
              <ul className="list-disc list-inside text-sm text-slate-600 flex flex-col gap-1">
                {result.deliverables.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-1">검수 조건</p>
          <ul className="list-disc list-inside text-sm text-slate-600 flex flex-col gap-1 mb-4">
            {result.acceptanceCriteria.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">유지보수</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{result.maintenance}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">변경 요청 규정</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{result.changeRequestPolicy}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">계약 해지 조건</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{result.terminationClause}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">저작권</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{result.intellectualProperty}</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-slate-700 mb-1">비밀유지</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mb-4">{result.confidentiality}</p>

          <p className="text-sm font-semibold text-slate-700 mb-1">기타 특약</p>
          {result.specialTerms.length === 0 ? (
            <p className="text-sm text-slate-400">없음</p>
          ) : (
            <ul className="list-disc list-inside text-sm text-slate-600 flex flex-col gap-1">
              {result.specialTerms.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </Card>
      </Container>
    </Section>
  );
}
