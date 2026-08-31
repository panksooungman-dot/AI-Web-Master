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

/**
 * 프로젝트 타임라인만 단독으로 출력하는 페이지 — `/quote/[token]`의 탭으로 진입한다.
 * 같은 공개 조회 API(`/api/quote/public/[token]`)를 그대로 재사용하고 timeline 필드만
 * 렌더링한다. `/quote/` prefix라 SiteChrome이 이 페이지도 자동으로 헤더·푸터 없이 보여준다.
 */
export default function PublicTimelinePage() {
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

  if (loadError || !data || !data.timeline) {
    return (
      <Section background="white">
        <Container className="max-w-3xl">
          <QuoteDocumentTabs
            token={params.token}
            hasEstimate={Boolean(data?.estimate)}
            hasSpecification={Boolean(data?.specification)}
            hasTimeline={Boolean(data?.timeline)}
          />
          <p className="py-12 text-center text-slate-500">{loadError ?? "프로젝트 일정을 찾을 수 없습니다."}</p>
        </Container>
      </Section>
    );
  }

  const { companyName, timeline } = data;

  return (
    <Section
      background="white"
      {...componentMarker("PublicTimelinePage", "app/quote/[token]/timeline/page.tsx", "의뢰자 공개 프로젝트 일정")}
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">프로젝트 일정</h2>
          <p className="text-sm text-slate-600 mb-4">{timeline.result.overview}</p>
          <p className="text-sm text-slate-500 mb-4">
            총 소요기간: <span className="font-semibold text-slate-800">{timeline.result.totalDurationWeeks}주</span>
          </p>

          <div className="flex flex-col gap-2">
            {timeline.result.phases.map((phase, i) => (
              <div key={i} className="rounded border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-800">
                  {i + 1}. {phase.name}
                  <span className="ml-2 text-xs font-normal text-slate-400">{phase.durationDays}일</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">{phase.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </Section>
  );
}
