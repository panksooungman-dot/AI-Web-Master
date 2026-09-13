"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@cnbiz/ui";
import { Container, Section } from "@cnbiz/layout-primitives";
import type { EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import type { ContractRecord } from "@/lib/contracts/types";
import { buildDefaultContractDocument } from "@/lib/contracts/document";
import type { ProposalRecord } from "@/lib/proposals/types";
import { componentMarker } from "@/lib/dev/component-marker";
import { DocumentWatermark } from "@/components/DocumentWatermark";
import { QuoteDocumentTabs } from "@/components/quote/QuoteDocumentTabs";
import { SignaturePad } from "@/components/quote/SignaturePad";
import { SignatureModal } from "@/components/quote/SignatureModal";

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
  const [signerName, setSignerName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [isSubmittingSignature, setIsSubmittingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

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

  // 견적서의 accept/reject(POST /api/quote/public/[token]/decision)와 동일한 원칙 — 로그인 없이
  // 토큰만으로 최신 계약서 1건에 서명을 제출한다. 성공 시 data.contract를 새로 받은 값으로
  // 교체해 화면에 즉시 서명 완료 상태(재서명 폼 대신 제출된 서명 이미지)가 반영되게 한다.
  async function handleSubmitSignature() {
    if (!signatureDataUrl || !signerName.trim()) return;
    setIsSubmittingSignature(true);
    setSignatureError(null);

    try {
      const res = await fetch(`/api/quote/public/${params.token}/contract-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: signatureDataUrl, signerName: signerName.trim() }),
      });
      const json: { success: boolean; contract?: ContractRecord; error?: string } = await res.json();

      if (!json.success || !json.contract) {
        setSignatureError(json.error ?? "서명 제출에 실패했습니다.");
        return;
      }
      setData((prev) => (prev ? { ...prev, contract: json.contract } : prev));
      setIsSignatureModalOpen(false);
    } catch {
      setSignatureError("서명 제출 중 오류가 발생했습니다.");
    } finally {
      setIsSubmittingSignature(false);
    }
  }

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
  const doc = buildDefaultContractDocument(contract);

  function openSignatureModal() {
    setSignatureDataUrl(null);
    setSignatureError(null);
    if (contract.clientSignature) {
      setSignerName(contract.clientSignature.signerName);
    }
    setIsSignatureModalOpen(true);
  }

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

          <div className="mt-8 border-t border-slate-200 pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">공급자 (갑)</p>
              <p className="text-sm text-slate-600">{doc.supplier.companyName}</p>
              {(doc.supplier.ceoName || doc.supplier.sealImageUrl) && (
                <p className="text-sm text-slate-600 flex items-center">
                  {doc.supplier.ceoName && <span>대표 {doc.supplier.ceoName}</span>}
                  {doc.supplier.sealImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- 업로드된 임의 스토리지 URL이라 next/image 대상이 아님. 투명 배경 도장이라 이름 끝 글자에 살짝 겹치도록 배치(실제 종이 계약서의 날인 방식 재현).
                    <img
                      src={doc.supplier.sealImageUrl}
                      alt="공급자 도장/서명"
                      className="h-10 w-10 object-contain -ml-2"
                    />
                  )}
                </p>
              )}
              {doc.supplier.businessNumber && (
                <p className="text-sm text-slate-500">사업자번호 {doc.supplier.businessNumber}</p>
              )}
              {doc.supplier.address && <p className="text-sm text-slate-500">{doc.supplier.address}</p>}
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">의뢰자 (을)</p>
              <p className="text-sm text-slate-600">{doc.client.companyName || companyName}</p>
              {/* 공급자 쪽 "대표 {이름}" 줄에 도장이 나란히 붙는 것과 동일하게, 담당자명 옆에
                  서명 버튼(미서명) 또는 서명 이미지(서명 완료)를 같은 줄에 배치한다. */}
              <p className="text-sm text-slate-600 flex items-center gap-2">
                {doc.client.contactName && <span>담당 {doc.client.contactName}</span>}
                {contract.clientSignature ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL(캔버스 서명)이라 next/image 대상이 아님
                  <img
                    src={contract.clientSignature.imageDataUrl}
                    alt={`${contract.clientSignature.signerName} 서명`}
                    className="h-8 w-16 object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={openSignatureModal}
                    className="rounded bg-primary px-2 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    서명하기
                  </button>
                )}
              </p>
              {doc.client.phone && <p className="text-sm text-slate-500">{doc.client.phone}</p>}

              {contract.clientSignature && (
                <div className="mt-1 flex flex-col gap-1">
                  <p className="text-xs text-slate-500">
                    {contract.clientSignature.signerName} ·{" "}
                    {new Date(contract.clientSignature.signedAt).toLocaleString()} 서명 완료
                  </p>
                  <button
                    type="button"
                    onClick={openSignatureModal}
                    className="self-start text-xs text-primary underline hover:text-primary-dark"
                  >
                    서명 다시 하기
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 이 이미지 기반 서명은 공인전자서명이 아닙니다 — 당사자 간 확인 용도로만 사용하세요. */}
        <SignatureModal
          open={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          title={contract.clientSignature ? "서명 다시 하기" : "전자서명"}
        >
          <p className="text-xs text-slate-500 mb-4">
            아래에 서명을 그린 뒤 이름을 입력하고 제출해주세요. (공인전자서명이 아닌 서명 이미지 확인 방식입니다)
          </p>

          <label className="block text-xs text-slate-500 mb-1">서명자 이름</label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="이름을 입력하세요"
            className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
          />

          <SignaturePad onChange={setSignatureDataUrl} width={440} />

          <button
            type="button"
            onClick={handleSubmitSignature}
            disabled={!signatureDataUrl || !signerName.trim() || isSubmittingSignature}
            className="mt-4 rounded bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {isSubmittingSignature ? "제출 중..." : "서명 제출"}
          </button>

          {signatureError && <p className="mt-3 text-sm text-red-600">{signatureError}</p>}
        </SignatureModal>
      </Container>
    </Section>
  );
}
