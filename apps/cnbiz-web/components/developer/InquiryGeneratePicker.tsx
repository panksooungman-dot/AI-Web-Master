"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/developer/Card";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { InquiryRecord } from "@/lib/inquiries/types";
import { WEBSITE_TYPES } from "@/lib/websites/types";

const inputClass =
  "w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm outline-none focus:border-green-500";

interface InquiryGeneratePickerProps {
  title: string;
  description: string;
  generateLabel: string;
  /** 실제 생성 API 호출 + 성공 시 목록 반영은 호출부가 담당한다(이미 각 목록 화면의
   * handleGenerate* 함수가 이 역할을 하고 있어 중복 구현하지 않는다). 이 컴포넌트는 실패 시
   * 반환된 error 메시지를 그대로 보여주기만 한다 — 견적서 없이 프로젝트 일정을 생성하려는
   * 경우처럼 선행 문서 누락 등 서버가 이미 만들어 둔 안내 문구를 그대로 재사용한다. */
  onGenerate: (inquiryId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * /developer/design의 "🔗 의뢰에서 정보 불러오기" 검색·선택 UI를 다른 문서 생성 화면에도
 * 재사용할 수 있도록 추출한 공용 컴포넌트(2026-09-14, "Design 자동 채움 패턴을 다른 화면에도
 * 확대해달라"는 요청). Design과 달리 여기서는 채울 폼 필드가 없다 — 견적서·기능명세서·
 * 프로젝트 일정·계약서·제안서는 전부 AI Analysis(및 선행 문서)만으로 생성되는 100% 자동
 * 산출물이라 자유 입력 폼 자체가 없기 때문(각 목록 화면의 기존 안내 문구 참고). 그래서 여기서는
 * "의뢰를 고르면 그 자리에서 바로 생성" 한 단계로 단순화했다 — 검색·선택까지는 Design과 동일한
 * 패턴을 그대로 따른다.
 *
 * 지금까지 이 5개 문서 유형은 반드시 /developer/inquiries/[id] 상세 화면을 거쳐야만 생성할 수
 * 있었다. 이 컴포넌트는 그 기존 생성 API(POST /api/{estimates,specifications,timeline,
 * contracts,proposals})를 그대로 재사용하므로, 프로젝트 일정처럼 선행 문서(견적서·기능명세서)가
 * 필요한 경우에도 새로운 검증 로직을 추가하지 않는다 — 서버가 이미 반환하는 "먼저 기술
 * 견적서를 생성하세요." 같은 안내 메시지를 그대로 보여줄 뿐이다.
 */
export function InquiryGeneratePicker({ title, description, generateLabel, onGenerate }: InquiryGeneratePickerProps) {
  const [inquiryOptions, setInquiryOptions] = useState<InquiryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/inquiries")
        .then((res) => res.json())
        .then((json: { inquiries?: InquiryRecord[] }) => setInquiryOptions(json.inquiries ?? []))
        .catch(() => setLoadError("의뢰 목록을 불러오지 못했습니다."))
        .finally(() => setIsLoading(false));
    });
    // 목록은 마운트 시 1회만 불러오면 된다 — Design 화면의 동일 패턴과 일치.
  }, []);

  async function handleGenerateClick(inquiryId: string) {
    setGeneratingId(inquiryId);
    setGenerateError(null);

    try {
      const result = await onGenerate(inquiryId);
      if (!result.success) {
        setGenerateError(result.error ?? "생성에 실패했습니다.");
      }
    } catch {
      setGenerateError("생성 중 오류가 발생했습니다.");
    } finally {
      setGeneratingId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const matches = (
    query
      ? inquiryOptions.filter((inquiry) => `${inquiry.companyName} ${inquiry.contactName}`.toLowerCase().includes(query))
      : inquiryOptions
  ).slice(0, 20);

  return (
    <Card title={title} className="mb-6">
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="회사명 또는 담당자명 검색"
        className={`${inputClass} mb-3`}
      />
      {generateError && (
        <StatusMessage tone="error" className="mb-3">
          {generateError}
        </StatusMessage>
      )}
      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : matches.length === 0 ? (
        <p className="text-sm text-gray-500">{query ? "검색 결과가 없습니다." : "등록된 의뢰가 없습니다."}</p>
      ) : (
        <ul className="flex flex-col gap-1 max-h-64 overflow-y-auto">
          {matches.map((inquiry) => (
            <li
              key={inquiry.id}
              className="flex items-center gap-3 rounded px-3 py-2 bg-gray-800 hover:bg-gray-750 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-gray-200">{inquiry.companyName || inquiry.contactName}</span>{" "}
                <span className="text-xs text-gray-500">
                  {WEBSITE_TYPES.find((t) => t.id === inquiry.siteType)?.label ?? inquiry.siteType} ·{" "}
                  {new Date(inquiry.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleGenerateClick(inquiry.id)}
                disabled={generatingId === inquiry.id}
                className="shrink-0 rounded bg-green-700 hover:bg-green-600 px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {generatingId === inquiry.id ? "생성 중..." : generateLabel}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
