"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { EstimateDocumentDetails, EstimateRecord } from "@/lib/estimates/types";
import type { SpecificationRecord } from "@/lib/specifications/types";
import type { TimelineRecord } from "@/lib/timeline/types";
import { toKoreanAmountPhrase } from "@/lib/estimates/koreanNumber";
import { buildDefaultEstimateDocument } from "@/lib/estimates/document";

interface EstimateResponse {
  estimate?: EstimateRecord;
  error?: string;
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-blue-500";

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(estimate: EstimateRecord, doc: Required<EstimateDocumentDetails>): string {
  const { input, result } = estimate;
  const lines = [
    `# 기술 견적서 — ${input.companyName}`,
    "",
    `- 건명: ${doc.projectTitle}`,
    `- 개발기간: ${doc.developmentPeriod}`,
    `- 유효기간: ${doc.validityPeriod}`,
    `- 납기일: ${doc.dueDate || "(미정)"}`,
    `- 유지보수기간: ${doc.maintenancePeriod}`,
    `- 제안금액: ${doc.finalAmount.toLocaleString()}원 (${toKoreanAmountPhrase(doc.finalAmount)})`,
    `- 생성일: ${new Date(estimate.createdAt).toLocaleString()}`,
    "",
    "## 요약",
    result.summary,
    "",
    "## 산출내역",
    ...result.lineItems.map((item) => `- **${item.name}**(${item.estimatedHours}h) — ${item.description}`),
    "",
    "## 참고사항",
    doc.notes,
    "",
    "## 대금지불방법",
    doc.paymentTerms,
    "",
    "## 공급자",
    `- 회사명: ${doc.supplier.companyName || "(미기재)"}`,
    `- 사업자번호: ${doc.supplier.businessNumber || "(미기재)"}`,
    `- 대표자: ${doc.supplier.ceoName || "(미기재)"}`,
    `- 담당자: ${doc.supplier.contactName || "(미기재)"}`,
    `- 전화: ${doc.supplier.phone || "(미기재)"}`,
    `- 주소: ${doc.supplier.address || "(미기재)"}`,
  ];
  return lines.join("\n");
}


export default function EstimateDetailPage() {
  const params = useParams<{ id: string }>();

  const [estimate, setEstimate] = useState<EstimateRecord | null>(null);
  const [doc, setDoc] = useState<Required<EstimateDocumentDetails> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [siblingSpecificationId, setSiblingSpecificationId] = useState<string | null>(null);
  const [siblingTimelineId, setSiblingTimelineId] = useState<string | null>(null);

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
        setDoc(buildDefaultEstimateDocument(data.estimate));
      })
      .catch(() => setLoadError("견적서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  // 견적서에는 기능명세서/프로젝트 일정 id가 직접 저장되어 있지 않아(생성 순서상 나중에 만들어짐),
  // 같은 inquiryId를 가진 최신 문서를 찾아 상단 탭 링크로 연결한다. 없으면 탭을 표시하지 않는다.
  useEffect(() => {
    if (!estimate) return;

    Promise.all([
      fetch("/api/specifications").then((res) => res.json()),
      fetch("/api/timeline").then((res) => res.json()),
    ]).then(([specJson, timelineJson]: [{ specifications?: SpecificationRecord[] }, { timelines?: TimelineRecord[] }]) => {
      const spec = (specJson.specifications ?? []).find((s) => s.inquiryId === estimate.inquiryId);
      const timeline = (timelineJson.timelines ?? []).find((t) => t.inquiryId === estimate.inquiryId);
      setSiblingSpecificationId(spec?.id ?? null);
      setSiblingTimelineId(timeline?.id ?? null);
    });
  }, [estimate]);

  async function handleSave() {
    if (!estimate || !doc) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/estimates/${estimate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      const data: { success: boolean; estimate?: EstimateRecord; error?: string } = await res.json();

      if (!data.success || !data.estimate) {
        setSaveMessage({ tone: "error", text: data.error ?? "저장에 실패했습니다." });
        return;
      }
      setEstimate(data.estimate);
      setSaveMessage({ tone: "success", text: "저장되었습니다." });
    } catch {
      setSaveMessage({ tone: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  }

  // /developer/inquiries/[id]의 "고객 공유" 카드와 동일한 API(POST /api/website-orders/[id]/share)를
  // 이 페이지에서도 바로 호출한다 — 기능명세서·프로젝트 일정이 아직 없어도 견적서만으로 공유 가능.
  async function handleShare() {
    if (!estimate) return;
    setIsSharing(true);
    setShareMessage(null);

    try {
      const res = await fetch(`/api/website-orders/${estimate.websiteOrderId}/share`, { method: "POST" });
      const data: { success: boolean; shareUrl?: string; error?: string } = await res.json();

      if (!data.success) {
        setShareMessage({ tone: "error", text: data.error ?? "문자 발송에 실패했습니다." });
        return;
      }
      setShareMessage({ tone: "success", text: `문자를 발송했습니다. (${data.shareUrl})` });
    } catch {
      setShareMessage({ tone: "error", text: "문자 발송 중 오류가 발생했습니다." });
    } finally {
      setIsSharing(false);
    }
  }

  if (isLoading) return <LoadingText />;

  if (loadError || !estimate || !doc) {
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
        title="기술 견적서"
        description={`${input.companyName} · ${input.detectedBusinessType} · ${new Date(estimate.createdAt).toLocaleString()}`}
        actions={estimate.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
      />

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : "변경사항 저장"}
        </button>
        <button
          onClick={() =>
            downloadBlob(JSON.stringify(estimate, null, 2), `estimate-${estimate.id}.json`, "application/json")
          }
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(estimate, doc), `estimate-${estimate.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="rounded bg-purple-600 hover:bg-purple-700 px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
        >
          {isSharing ? "발송 중..." : "문자로 공유"}
        </button>
        {siblingSpecificationId && (
          <Link
            href={`/developer/specifications/${siblingSpecificationId}`}
            className="rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm transition-colors"
          >
            기능 명세서 →
          </Link>
        )}
        {siblingTimelineId && (
          <Link
            href={`/developer/timeline/${siblingTimelineId}`}
            className="rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm transition-colors"
          >
            프로젝트 일정 →
          </Link>
        )}
        {saveMessage && <StatusMessage tone={saveMessage.tone}>{saveMessage.text}</StatusMessage>}
        {shareMessage && <StatusMessage tone={shareMessage.tone}>{shareMessage.text}</StatusMessage>}
      </div>

      {/* 견적서 문서 본문 */}
      <Card className="mb-6">
        <div className="border-b border-gray-800 pb-4 mb-4">
          <h2 className="text-2xl font-bold text-white text-center">기 술 견 적 서</h2>
        </div>

        <p className="text-sm text-gray-300 mb-1">{input.companyName} 귀중</p>
        <p className="text-sm text-gray-400 mb-4">홈페이지 제작에 대한 견적을 다음과 같이 청구합니다.</p>

        <div className="rounded border-l-4 border-blue-500 bg-blue-950/40 px-4 py-3 mb-6">
          <p className="text-xl font-bold text-white">
            ₩{doc.finalAmount.toLocaleString()}{" "}
            <span className="text-base font-normal text-gray-300">({toKoreanAmountPhrase(doc.finalAmount)})</span>
          </p>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-gray-800">
            <tbody>
              <tr className="border-b border-gray-800">
                <th className="w-32 bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">건명</th>
                <td className="px-3 py-2" colSpan={3}>
                  <input
                    type="text"
                    value={doc.projectTitle}
                    onChange={(e) => setDoc({ ...doc, projectTitle: e.target.value })}
                    className={inputClass}
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <th className="bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">개발기간</th>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={doc.developmentPeriod}
                    onChange={(e) => setDoc({ ...doc, developmentPeriod: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <th className="w-28 bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">유효기간</th>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={doc.validityPeriod}
                    onChange={(e) => setDoc({ ...doc, validityPeriod: e.target.value })}
                    className={inputClass}
                  />
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <th className="bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">납기일</th>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="예: 2026-12-31"
                    value={doc.dueDate}
                    onChange={(e) => setDoc({ ...doc, dueDate: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <th className="bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">작성일</th>
                <td className="px-3 py-2 text-gray-300">{new Date(estimate.createdAt).toLocaleDateString()}</td>
              </tr>
              <tr>
                <th className="bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">유지보수기간</th>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={doc.maintenancePeriod}
                    onChange={(e) => setDoc({ ...doc, maintenancePeriod: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <th className="bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">제안금액</th>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={doc.finalAmount}
                    onChange={(e) => setDoc({ ...doc, finalAmount: Number(e.target.value) })}
                    className={inputClass}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-gray-800">
            <thead>
              <tr className="bg-gray-900 text-gray-300">
                <th className="px-3 py-2 text-left border-b border-gray-800">구성</th>
                <th className="px-3 py-2 text-left border-b border-gray-800">세부항목</th>
                <th className="px-3 py-2 text-right border-b border-gray-800 w-28">예상 소요시간</th>
              </tr>
            </thead>
            <tbody>
              {result.lineItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-800 last:border-0">
                  <td className="px-3 py-2 font-semibold text-gray-200 whitespace-nowrap">{item.name}</td>
                  <td className="px-3 py-2 text-gray-400">{item.description}</td>
                  <td className="px-3 py-2 text-right text-gray-300">{item.estimatedHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">참고사항</p>
            <textarea
              value={doc.notes}
              onChange={(e) => setDoc({ ...doc, notes: e.target.value })}
              rows={4}
              className={`${inputClass} resize-none font-normal`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">대금지불방법</p>
            <textarea
              value={doc.paymentTerms}
              onChange={(e) => setDoc({ ...doc, paymentTerms: e.target.value })}
              rows={4}
              className={`${inputClass} resize-none font-normal`}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-300 mb-2">공급자 정보</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-20 shrink-0">회사명</span>
              <input
                type="text"
                value={doc.supplier.companyName}
                onChange={(e) => setDoc({ ...doc, supplier: { ...doc.supplier, companyName: e.target.value } })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-20 shrink-0">사업자번호</span>
              <input
                type="text"
                value={doc.supplier.businessNumber}
                onChange={(e) => setDoc({ ...doc, supplier: { ...doc.supplier, businessNumber: e.target.value } })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-20 shrink-0">대표자</span>
              <input
                type="text"
                value={doc.supplier.ceoName}
                onChange={(e) => setDoc({ ...doc, supplier: { ...doc.supplier, ceoName: e.target.value } })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-20 shrink-0">담당자</span>
              <input
                type="text"
                value={doc.supplier.contactName}
                onChange={(e) => setDoc({ ...doc, supplier: { ...doc.supplier, contactName: e.target.value } })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-20 shrink-0">전화</span>
              <input
                type="text"
                value={doc.supplier.phone}
                onChange={(e) => setDoc({ ...doc, supplier: { ...doc.supplier, phone: e.target.value } })}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-20 shrink-0">주소</span>
              <input
                type="text"
                value={doc.supplier.address}
                onChange={(e) => setDoc({ ...doc, supplier: { ...doc.supplier, address: e.target.value } })}
                className={inputClass}
              />
            </label>
          </div>
        </div>
      </Card>

      <Card title="요약">
        <p className="text-sm text-gray-200 whitespace-pre-wrap break-words">{result.summary}</p>
      </Card>
    </div>
  );
}
