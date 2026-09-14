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
import { buildDefaultEstimateDocument } from "@/lib/estimates/document";
import { toKoreanAmountPhrase } from "@/lib/estimates/koreanNumber";
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

  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

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

  async function handleDecision(decision: "accepted" | "rejected") {
    setIsSubmittingDecision(true);
    setDecisionError(null);
    try {
      const res = await fetch(`/api/quote/public/${params.token}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await res.json();
      if (!json.success) {
        setDecisionError(json.error ?? "처리하지 못했습니다.");
        return;
      }
      setData((prev) => (prev ? { ...prev, estimate: json.estimate } : prev));
    } catch {
      setDecisionError("처리하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmittingDecision(false);
    }
  }

  async function handleSendMessage() {
    const trimmed = messageInput.trim();
    if (!trimmed) return;

    setIsSubmittingMessage(true);
    setMessageError(null);
    try {
      const res = await fetch(`/api/quote/public/${params.token}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      const json = await res.json();
      if (!json.success) {
        setMessageError(json.error ?? "전송하지 못했습니다.");
        return;
      }
      setData((prev) => (prev ? { ...prev, estimate: json.estimate } : prev));
      setMessageInput("");
    } catch {
      setMessageError("전송하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmittingMessage(false);
    }
  }

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

  const { companyName, estimate, specification, timeline, contract, proposal } = data;
  const doc = estimate ? buildDefaultEstimateDocument(estimate) : null;

  return (
    <Section background="white" {...componentMarker("PublicQuotePage", "app/quote/[token]/page.tsx", "의뢰자 공개 문서")}>
      <Container className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-primary">PROJECT DOCUMENTS</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">{companyName} 프로젝트 문서</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          견적서·기능 명세서·프로젝트 일정·계약서·제안서를 확인하실 수 있습니다. 궁금하신 점은 담당자에게 문의해주세요.
        </p>

        <QuoteDocumentTabs
          token={params.token}
          hasEstimate={Boolean(estimate)}
          hasSpecification={Boolean(specification)}
          hasTimeline={Boolean(timeline)}
          hasContract={Boolean(contract)}
          hasProposal={Boolean(proposal)}
        />

        {!estimate && !specification && !timeline && (
          <Card className="mt-8 text-center text-slate-500">아직 준비된 문서가 없습니다.</Card>
        )}

        {estimate && doc && (
          <Card className="relative isolate mt-8 overflow-hidden">
            <DocumentWatermark />
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

            {/*
              모바일(390px)에서 한 행에 th/td 2쌍(4칸)을 욱여넣으면 "개발기간"·"유지보수기간"
              값 칸("2개월"·"6개월")이 남는 공간을 거의 못 받아 한 글자씩 세로로 줄바꿈되는
              문제가 있었다(2026-09-14 실사용 스크린샷 확인) — 필드마다 한 행(라벨 1칸 + 값
              1칸)만 쓰도록 바꿔, "공급자 정보" 테이블(아래)과 동일한 패턴으로 통일했다.
              한 필드당 값 칸이 항상 테이블 전체 너비를 쓸 수 있어 좁은 화면에서도 줄바꿈이
              자연스럽다.
            */}
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <th className="w-28 whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      건명
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.projectTitle}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      개발기간
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.developmentPeriod}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      유효기간
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.validityPeriod}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      유지보수기간
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.maintenancePeriod}</td>
                  </tr>
                  <tr>
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      작성일
                    </th>
                    <td className="px-3 py-2 text-slate-800">{new Date(estimate.createdAt).toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/*
              데스크탑에서 잘 맞던 3열(구성/세부항목/예상 소요시간) 표가, 모바일(390px)에서는
              "구성"(줄바꿈 없음)·"예상 소요시간"(고정 폭)이 먼저 공간을 차지해 "세부항목" 설명이
              한두 글자씩만 들어가는 좁은 칸으로 밀려 알아보기 어려웠다(2026-09-14 실사용
              스크린샷 확인). 표 자체를 좁히는 대신, 좁은 화면에서는 항목당 카드 1개(제목+시간을
              한 줄에, 설명은 그 아래 전체 폭으로)로 쌓아 보여주고, 표는 공간이 넉넉한 `sm:`
              이상에서만 그대로 유지한다.
            */}
            <div className="mb-6 flex flex-col gap-2 sm:hidden">
              {estimate.result.lineItems.map((item, i) => (
                <div key={i} className="rounded border border-slate-200 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-slate-700">{item.name}</p>
                    <p className="shrink-0 text-sm text-slate-600">{item.estimatedHours}h</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto mb-6 sm:block">
              <table className="w-full text-sm border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="px-3 py-2 text-left border-b border-slate-200">구성</th>
                    <th className="px-3 py-2 text-left border-b border-slate-200">세부항목</th>
                    <th className="whitespace-nowrap px-3 py-2 text-right border-b border-slate-200 w-28">
                      예상 소요시간
                    </th>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">참고사항</p>
                <p className="text-xs text-slate-500 whitespace-pre-wrap">{doc.notes}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">대금지불방법</p>
                <p className="text-xs text-slate-500 whitespace-pre-wrap">{doc.paymentTerms}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">공급자 정보</p>
              <table className="w-full text-xs border border-slate-200">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <th className="w-28 whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      회사명
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.supplier.companyName || "(미기재)"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      사업자등록번호
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                      {doc.supplier.businessNumber || "(미기재)"}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      대표자
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.supplier.ceoName || "(미기재)"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      담당자
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.supplier.contactName || "(미기재)"}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      연락처
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                      {doc.supplier.phone || "(미기재)"}
                    </td>
                  </tr>
                  <tr>
                    <th className="whitespace-nowrap bg-slate-50 text-slate-500 text-left px-3 py-2 font-semibold">
                      주소
                    </th>
                    <td className="px-3 py-2 text-slate-800">{doc.supplier.address || "(미기재)"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {estimate && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
            <p className="text-center text-sm font-semibold text-slate-700">견적서를 검토하셨나요?</p>

            {estimate.clientDecision ? (
              <div
                className={`mt-4 rounded-lg px-4 py-3 text-center text-sm font-semibold ${
                  estimate.clientDecision === "accepted"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {estimate.clientDecision === "accepted"
                  ? "견적서를 수락하셨습니다. 담당자가 곧 연락드리겠습니다."
                  : "견적서를 거절하셨습니다. 담당자가 확인 후 연락드리겠습니다."}
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={() => handleDecision("accepted")}
                  className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  견적서 수락
                </button>
                <button
                  type="button"
                  disabled={isSubmittingDecision}
                  onClick={() => handleDecision("rejected")}
                  className="rounded-lg border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  견적서 거절
                </button>
              </div>
            )}
            {decisionError && <p className="mt-2 text-center text-sm text-red-600">{decisionError}</p>}

            <div className="mt-6 border-t border-slate-200 pt-6">
              {estimate.messages && estimate.messages.length > 0 && (
                <div className="mb-4 flex flex-col gap-3">
                  {estimate.messages.map((message) => (
                    <div key={message.id} className={`flex ${message.from === "client" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.from === "client" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {message.from === "admin" && <p className="mb-1 text-xs font-semibold text-slate-400">담당자</p>}
                        <p className="whitespace-pre-wrap">{message.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={messageInput}
                  onChange={(event) => setMessageInput(event.target.value)}
                  placeholder="메시지를 남겨주세요. (Enter로 전송)"
                  disabled={isSubmittingMessage}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-primary focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isSubmittingMessage || !messageInput.trim()}
                  aria-label="메시지 전송"
                  className="flex shrink-0 items-center justify-center rounded-lg bg-primary p-2.5 text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  <svg className="h-4 w-4" aria-hidden fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.769 59.769 0 0121.485 12 59.768 59.768 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </form>
              {messageError && <p className="mt-2 text-sm text-red-600">{messageError}</p>}
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
