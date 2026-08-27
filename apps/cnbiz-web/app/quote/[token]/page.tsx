"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import { buildDefaultEstimateDocument } from "@/lib/estimates/document";
import { toKoreanAmountPhrase } from "@/lib/estimates/koreanNumber";
import { componentMarker } from "@/lib/dev/component-marker";

interface PublicQuoteResponse {
  companyName?: string;
  estimate?: EstimateRecord | null;
  specification?: SpecificationRecord | null;
  timeline?: TimelineRecord | null;
  error?: string;
}

const PRIORITY_LABEL: Record<string, string> = { High: "필수", Medium: "권장", Low: "선택" };

/**
 * 의뢰자 공개 문서 페이지 — 관리자가 SOLAPI 문자로 보낸 링크(`/quote/{token}`)를 로그인 없이
 * 여는 화면. `/api/quote/public/[token]`(RBAC 예외 — lib/auth/rbac.ts)에서만 데이터를 받고,
 * 편집 기능은 전혀 없다(읽기 전용) — 수정은 여전히 관리자 화면(/developer/estimates/[id] 등)
 * 에서만 가능하다.
 */
export default function PublicQuotePage() {
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

  if (loadError || !data) {
    return (
      <Section background="white">
        <Container className="max-w-3xl py-12 text-center text-slate-500">
          {loadError ?? "문서를 찾을 수 없습니다."}
        </Container>
      </Section>
    );
  }

  const { companyName, estimate, specification, timeline } = data;
  const doc = estimate ? buildDefaultEstimateDocument(estimate) : null;

  return (
    <Section background="white" {...componentMarker("PublicQuotePage", "app/quote/[token]/page.tsx", "의뢰자 공개 문서")}>
      <Container className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">PROJECT DOCUMENTS</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{companyName} 프로젝트 문서</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          견적서·기능 명세서·프로젝트 일정을 확인하실 수 있습니다. 궁금하신 점은 담당자에게 문의해주세요.
        </p>

        {!estimate && !specification && !timeline && (
          <Card className="mt-8 text-center text-slate-500">아직 준비된 문서가 없습니다.</Card>
        )}

        {estimate && doc && (
          <Card className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 text-center border-b border-slate-200 pb-4 mb-4">
              기 술 견 적 서
            </h2>
            <p className="text-sm text-slate-600 mb-1">{companyName} 귀중</p>
            <p className="text-sm text-slate-400 mb-4">홈페이지 제작에 대한 견적을 다음과 같이 안내드립니다.</p>

            <div className="rounded border-l-4 border-primary bg-blue-50 px-4 py-3 mb-6">
              <p className="text-xl font-bold text-slate-900">
                ₩{doc.finalAmount.toLocaleString()}{" "}
                <span className="text-base font-normal text-slate-600">
                  ({toKoreanAmountPhrase(doc.finalAmount)})
                </span>
              </p>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <th className="w-28 bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">건명</th>
                    <td className="px-3 py-2 text-slate-800" colSpan={3}>
                      {doc.projectTitle}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">개발기간</th>
                    <td className="px-3 py-2 text-slate-800">{doc.developmentPeriod}</td>
                    <th className="w-24 bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">유효기간</th>
                    <td className="px-3 py-2 text-slate-800">{doc.validityPeriod}</td>
                  </tr>
                  <tr>
                    <th className="bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">유지보수기간</th>
                    <td className="px-3 py-2 text-slate-800">{doc.maintenancePeriod}</td>
                    <th className="bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">작성일</th>
                    <td className="px-3 py-2 text-slate-800">{new Date(estimate.createdAt).toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 text-left border-b border-slate-200">구성</th>
                    <th className="px-3 py-2 text-left border-b border-slate-200">세부항목</th>
                    <th className="px-3 py-2 text-right border-b border-slate-200 w-28">예상 소요시간</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.result.lineItems.map((item, i) => (
                    <tr key={i} className="border-b border-slate-200 last:border-0">
                      <td className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{item.name}</td>
                      <td className="px-3 py-2 text-slate-500">{item.description}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{item.estimatedHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">참고사항</p>
                <p className="text-xs text-slate-500 whitespace-pre-wrap">{doc.notes}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">대금지불방법</p>
                <p className="text-xs text-slate-500 whitespace-pre-wrap">{doc.paymentTerms}</p>
              </div>
            </div>
          </Card>
        )}

        {specification && (
          <Card className="mt-8">
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
        )}

        {timeline && (
          <Card className="mt-8">
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
        )}
      </Container>
    </Section>
  );
}
