"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import { componentMarker } from "@/lib/dev/component-marker";
import { DocumentWatermark } from "@/components/DocumentWatermark";
import { QuoteDocumentTabs } from "@/components/quote/QuoteDocumentTabs";

interface PublicQuoteResponse {
  companyName?: string;
  estimate?: EstimateRecord | null;
  specification?: SpecificationRecord | null;
  timeline?: TimelineRecord | null;
  error?: string;
}

const PRIORITY_LABEL: Record<string, string> = { High: "필수", Medium: "권장", Low: "선택" };

/**
 * 기능 명세서만 단독으로 출력하는 페이지 — `/quote/[token]`의 "문서 보기" 버튼으로 진입한다.
 * 같은 공개 조회 API(`/api/quote/public/[token]`)를 그대로 재사용하고 specification 필드만
 * 렌더링한다. `/quote/` prefix라 SiteChrome이 이 페이지도 자동으로 헤더·푸터 없이 보여준다.
 */
export default function PublicSpecificationPage() {
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

  if (loadError || !data || !data.specification) {
    return (
      <Section background="white">
        <Container className="max-w-3xl">
          <QuoteDocumentTabs
            token={params.token}
            hasEstimate={Boolean(data?.estimate)}
            hasSpecification={Boolean(data?.specification)}
            hasTimeline={Boolean(data?.timeline)}
          />
          <p className="py-12 text-center text-slate-500">{loadError ?? "기능 명세서를 찾을 수 없습니다."}</p>
        </Container>
      </Section>
    );
  }

  const { companyName, specification } = data;

  return (
    <Section
      background="white"
      {...componentMarker("PublicSpecificationPage", "app/quote/[token]/specification/page.tsx", "의뢰자 공개 기능 명세서")}
    >
      <Container className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">PROJECT DOCUMENTS</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{companyName} 프로젝트 문서</h1>

        <QuoteDocumentTabs
          token={params.token}
          hasEstimate={Boolean(data.estimate)}
          hasSpecification={Boolean(data.specification)}
          hasTimeline={Boolean(data.timeline)}
        />

        <Card className="relative isolate mt-8 overflow-hidden">
          <DocumentWatermark />
          <h2 className="text-xl font-bold text-slate-900 mb-2">기능 명세서</h2>
          <p className="text-sm text-slate-600 mb-4">{specification.result.overview}</p>

          <p className="text-sm font-semibold text-slate-700 mb-2">페이지 구성</p>
          <ul className="mb-4 flex flex-col gap-1">
            {specification.result.pages.map((page, i) => (
              <li key={i} className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{page.name}</span> — {page.description}
              </li>
            ))}
          </ul>

          <p className="text-sm font-semibold text-slate-700 mb-2">주요 기능</p>
          <ul className="flex flex-col gap-1">
            {specification.result.features.map((feature, i) => (
              <li key={i} className="text-sm text-slate-600 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    feature.priority === "High"
                      ? "bg-amber-50 text-amber-700"
                      : feature.priority === "Medium"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {PRIORITY_LABEL[feature.priority] ?? feature.priority}
                </span>
                <span className="font-semibold text-slate-800">{feature.name}</span>
                <span className="text-slate-500">— {feature.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </Section>
  );
}
