"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ContractDocumentDetails, ContractPartyInfo, ContractRecord, ContractResult } from "@/lib/contracts/types";
import { buildDefaultContractDocument } from "@/lib/contracts/document";
import { DocumentWatermark } from "@/components/DocumentWatermark";

interface ContractResponse {
  contract?: ContractRecord;
  error?: string;
}

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-blue-500";
const textareaClass = `${inputClass} resize-none font-normal`;

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toMarkdown(contract: ContractRecord, result: ContractResult): string {
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
    ...(result.excludedScope.length > 0 ? result.excludedScope.map((item) => `- ${item}`) : ["- 없음"]),
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

/** 빈 줄(공백만 있는 항목)을 정리하고 저장한다 — 편집 중에는 빈 입력을 허용해야 하므로 여기서만 걸러낸다. */
function sanitizeResult(result: ContractResult): ContractResult {
  const trimList = (items: string[]) => items.map((item) => item.trim()).filter((item) => item.length > 0);
  return {
    ...result,
    title: result.title.trim(),
    developmentScope: trimList(result.developmentScope),
    excludedScope: trimList(result.excludedScope),
    paymentTerms: trimList(result.paymentTerms),
    deliverables: trimList(result.deliverables),
    acceptanceCriteria: trimList(result.acceptanceCriteria),
    specialTerms: trimList(result.specialTerms),
  };
}

interface ListEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

/** 개발 범위·결제 조건 등 문자열 배열 필드를 위한 항목 추가/삭제/편집 UI. */
function ListEditor({ label, items, onChange, placeholder }: ListEditorProps) {
  return (
    <div>
      <p className="text-sm font-semibold text-gray-300 mb-2">{label}</p>
      <div className="flex flex-col gap-2">
        {items.length === 0 && <p className="text-xs text-gray-500">항목이 없습니다.</p>}
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={item}
              placeholder={placeholder}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label={`${label} 항목 삭제`}
              className="shrink-0 rounded border border-gray-700 px-2.5 py-2 text-xs text-gray-400 hover:text-red-400 hover:border-red-700 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="self-start rounded border border-dashed border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
        >
          + 항목 추가
        </button>
      </div>
    </div>
  );
}

const PARTY_FIELDS: ReadonlyArray<{ key: keyof ContractPartyInfo; label: string }> = [
  { key: "companyName", label: "회사명" },
  { key: "businessNumber", label: "사업자번호" },
  { key: "ceoName", label: "대표자" },
  { key: "contactName", label: "담당자" },
  { key: "phone", label: "전화" },
  { key: "address", label: "주소" },
];

/** 공급자·의뢰자 정보 6개 필드를 동일한 레이아웃으로 편집한다(견적서 공급자 정보 UI와 동일 패턴). */
function PartyInfoFields({
  value,
  onChange,
}: {
  value: ContractPartyInfo;
  onChange: (value: ContractPartyInfo) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {PARTY_FIELDS.map(({ key, label }) => (
        <label key={key} className="flex items-center gap-2 text-xs text-gray-400">
          <span className="w-20 shrink-0">{label}</span>
          <input
            type="text"
            value={value[key] ?? ""}
            onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            className={inputClass}
          />
        </label>
      ))}
    </div>
  );
}

export default function ContractDetailPage() {
  const params = useParams<{ id: string }>();

  const [contract, setContract] = useState<ContractRecord | null>(null);
  const [result, setResult] = useState<ContractResult | null>(null);
  const [document, setDocument] = useState<Required<ContractDocumentDetails> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isUploadingSeal, setIsUploadingSeal] = useState(false);
  const [sealUploadError, setSealUploadError] = useState<string | null>(null);

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
        setResult(data.contract.result);
        setDocument(buildDefaultContractDocument(data.contract));
      })
      .catch(() => setLoadError("계약서를 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  }, [params.id]);

  async function handleSave() {
    if (!contract || !result || !document) return;
    setIsSaving(true);
    setSaveMessage(null);

    try {
      const sanitized = sanitizeResult(result);
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: sanitized, document }),
      });
      const data: { success: boolean; contract?: ContractRecord; error?: string } = await res.json();

      if (!data.success || !data.contract) {
        setSaveMessage({ tone: "error", text: data.error ?? "저장에 실패했습니다." });
        return;
      }
      setContract(data.contract);
      setResult(data.contract.result);
      setDocument(buildDefaultContractDocument(data.contract));
      setSaveMessage({ tone: "success", text: "저장되었습니다." });
    } catch {
      setSaveMessage({ tone: "error", text: "저장 중 오류가 발생했습니다." });
    } finally {
      setIsSaving(false);
    }
  }

  /** 견적서 첨부 업로드와 동일한 공용 엔드포인트(app/api/inquiries/upload)를 재사용해 공급자
   *  도장/서명 이미지를 업로드한다 — 별도 업로드 백엔드를 새로 만들지 않는다. */
  async function handleSealUpload(file: File) {
    if (!document) return;
    setIsUploadingSeal(true);
    setSealUploadError(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/inquiries/upload", { method: "POST", body });
      const data: { success: boolean; url?: string; error?: string } = await res.json();

      if (!data.success || !data.url) {
        setSealUploadError(data.error ?? "이미지 업로드에 실패했습니다.");
        return;
      }
      setDocument({ ...document, supplier: { ...document.supplier, sealImageUrl: data.url } });
    } catch {
      setSealUploadError("이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploadingSeal(false);
    }
  }

  if (isLoading) return <LoadingText />;

  if (loadError || !contract || !result || !document) {
    return (
      <div>
        <StatusMessage tone="error">{loadError ?? "계약서를 찾을 수 없습니다."}</StatusMessage>
        <Link href="/developer/contracts" className="text-blue-400 hover:underline text-sm mt-4 inline-block">
          ← 계약서 목록으로
        </Link>
      </div>
    );
  }

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
        title="계약서"
        description={new Date(contract.createdAt).toLocaleString()}
        actions={contract.simulated ? <Badge tone="warning">Simulated</Badge> : <Badge tone="success">AI 생성</Badge>}
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
          onClick={() => downloadBlob(JSON.stringify(contract, null, 2), `contract-${contract.id}.json`, "application/json")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadBlob(toMarkdown(contract, result), `contract-${contract.id}.md`, "text/markdown")}
          className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors"
        >
          Export Markdown
        </button>
        {saveMessage && <StatusMessage tone={saveMessage.tone}>{saveMessage.text}</StatusMessage>}
      </div>

      {/* 계약서 문서 본문 — 의뢰자 공개 페이지(/quote/[token]/contract)가 그대로 읽는 result를
          직접 수정한다. 별도 미리보기/편집 모드 구분 없이 저장 전까지는 이 화면에서만 보인다. */}
      <Card className="relative isolate mb-6 overflow-hidden">
        <DocumentWatermark opacity={0.12} />
        <div className="border-b border-gray-800 pb-4 mb-4">
          <input
            type="text"
            value={result.title}
            onChange={(e) => setResult({ ...result, title: e.target.value })}
            className={`${inputClass} text-center text-xl font-bold text-white bg-transparent border-transparent hover:border-gray-700 focus:bg-gray-800`}
          />
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm border border-gray-800">
            <tbody>
              <tr className="border-b border-gray-800">
                <th className="w-32 bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">계약 금액</th>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    value={result.contractAmount.amount}
                    onChange={(e) =>
                      setResult({
                        ...result,
                        contractAmount: { ...result.contractAmount, amount: Number(e.target.value) },
                      })
                    }
                    className={inputClass}
                  />
                </td>
                <th className="w-28 bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">통화</th>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={result.contractAmount.currency}
                    onChange={(e) =>
                      setResult({
                        ...result,
                        contractAmount: { ...result.contractAmount, currency: e.target.value },
                      })
                    }
                    className={inputClass}
                  />
                </td>
              </tr>
              <tr>
                <th className="bg-gray-900 text-gray-400 text-left px-3 py-2 font-semibold">VAT</th>
                <td className="px-3 py-2" colSpan={3}>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={result.contractAmount.vatIncluded}
                      onChange={(e) =>
                        setResult({
                          ...result,
                          contractAmount: { ...result.contractAmount, vatIncluded: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded border-gray-700 bg-gray-800"
                    />
                    VAT 포함
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-300 mb-2">프로젝트 개요</p>
          <textarea
            value={result.overview}
            onChange={(e) => setResult({ ...result, overview: e.target.value })}
            rows={3}
            className={textareaClass}
          />
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-300 mb-2">계약 목적</p>
          <textarea
            value={result.purpose}
            onChange={(e) => setResult({ ...result, purpose: e.target.value })}
            rows={2}
            className={textareaClass}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ListEditor
            label="개발 범위"
            items={result.developmentScope}
            onChange={(items) => setResult({ ...result, developmentScope: items })}
          />
          <ListEditor
            label="제외 범위"
            items={result.excludedScope}
            onChange={(items) => setResult({ ...result, excludedScope: items })}
          />
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-300 mb-2">개발 일정</p>
          <textarea
            value={result.schedule}
            onChange={(e) => setResult({ ...result, schedule: e.target.value })}
            rows={2}
            className={textareaClass}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ListEditor
            label="결제 조건"
            items={result.paymentTerms}
            onChange={(items) => setResult({ ...result, paymentTerms: items })}
          />
          <ListEditor
            label="산출물"
            items={result.deliverables}
            onChange={(items) => setResult({ ...result, deliverables: items })}
          />
        </div>

        <div className="mb-6">
          <ListEditor
            label="검수 조건"
            items={result.acceptanceCriteria}
            onChange={(items) => setResult({ ...result, acceptanceCriteria: items })}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">유지보수</p>
            <textarea
              value={result.maintenance}
              onChange={(e) => setResult({ ...result, maintenance: e.target.value })}
              rows={3}
              className={textareaClass}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">변경 요청 규정</p>
            <textarea
              value={result.changeRequestPolicy}
              onChange={(e) => setResult({ ...result, changeRequestPolicy: e.target.value })}
              rows={3}
              className={textareaClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">계약 해지 조건</p>
            <textarea
              value={result.terminationClause}
              onChange={(e) => setResult({ ...result, terminationClause: e.target.value })}
              rows={3}
              className={textareaClass}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">저작권</p>
            <textarea
              value={result.intellectualProperty}
              onChange={(e) => setResult({ ...result, intellectualProperty: e.target.value })}
              rows={3}
              className={textareaClass}
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-gray-300 mb-2">비밀유지</p>
          <textarea
            value={result.confidentiality}
            onChange={(e) => setResult({ ...result, confidentiality: e.target.value })}
            rows={2}
            className={textareaClass}
          />
        </div>

        <ListEditor
          label="기타 특약"
          items={result.specialTerms}
          onChange={(items) => setResult({ ...result, specialTerms: items })}
        />
      </Card>

      {/* 계약 당사자 — 공급자(CNBIZ)는 미리 업로드해둔 도장/서명 이미지를 계속 재사용하고,
          의뢰자는 /quote/[token]/contract에서 직접 그린 서명이 도착하면 여기에 표시된다. */}
      <Card title="계약 당사자" className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">공급자</p>
            <PartyInfoFields
              value={document.supplier}
              onChange={(value) => setDocument({ ...document, supplier: { ...document.supplier, ...value } })}
            />
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">도장/서명 이미지</p>
              {document.supplier.sealImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- 업로드된 임의 외부/스토리지 URL이라 next/image의 정적 도메인 allowlist와 맞지 않음
                <img
                  src={document.supplier.sealImageUrl}
                  alt="공급자 도장/서명"
                  className="h-16 w-16 object-contain rounded border border-gray-700 bg-white mb-2"
                />
              )}
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingSeal}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSealUpload(file);
                  e.target.value = "";
                }}
                className="text-xs text-gray-400 file:mr-3 file:rounded file:border-0 file:bg-gray-700 file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-gray-600"
              />
              {isUploadingSeal && <p className="text-xs text-gray-500 mt-1">업로드 중...</p>}
              {sealUploadError && <StatusMessage tone="error" className="mt-1">{sealUploadError}</StatusMessage>}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-300 mb-2">의뢰자</p>
            <PartyInfoFields
              value={document.client}
              onChange={(value) => setDocument({ ...document, client: { ...document.client, ...value } })}
            />
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">전자서명</p>
              {contract.clientSignature ? (
                <div className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL(캔버스 서명)이라 next/image 대상이 아님 */}
                  <img
                    src={contract.clientSignature.imageDataUrl}
                    alt={`${contract.clientSignature.signerName} 서명`}
                    className="h-16 w-40 object-contain rounded border border-gray-700 bg-white"
                  />
                  <p className="text-xs text-gray-500">
                    {contract.clientSignature.signerName} · {new Date(contract.clientSignature.signedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <Badge tone="neutral">서명 대기 중</Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
