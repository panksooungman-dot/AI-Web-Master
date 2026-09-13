"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface QuoteDocumentTabsProps {
  token: string;
  hasEstimate: boolean;
  hasSpecification: boolean;
  hasTimeline: boolean;
  hasContract?: boolean;
  hasProposal?: boolean;
}

/**
 * 견적서/기능명세서/프로젝트 타임라인/계약서/제안서를 각각 별도 페이지(문서만 출력)로 오갈 수
 * 있는 탭 내비게이션. 문서가 아직 생성되지 않은 종류는 비활성 탭으로 표시한다. `/quote/[token]`
 * (견적서)·`/quote/[token]/specification`·`/quote/[token]/timeline`·`/quote/[token]/contract`·
 * `/quote/[token]/proposal` 다섯 페이지가 공유한다.
 *
 * 2026-09-13 — 계약서·제안서는 기존에 로그인이 필요한 고객 포털(/customer/orders/[id])에서만
 * 볼 수 있었으나, 계정 발급이 관리자 수동 작업이라 실사용 경로가 아니었다. 견적서 등과 완전히
 * 동일한 무로그인 토큰 링크로 통일해 관리자가 매번 별도 계정을 만들어주지 않아도 되도록 했다.
 */
export function QuoteDocumentTabs({
  token,
  hasEstimate,
  hasSpecification,
  hasTimeline,
  hasContract = false,
  hasProposal = false,
}: QuoteDocumentTabsProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/quote/${token}`, label: "견적서", available: hasEstimate },
    { href: `/quote/${token}/specification`, label: "기능명세서", available: hasSpecification },
    { href: `/quote/${token}/timeline`, label: "프로젝트 타임라인", available: hasTimeline },
    { href: `/quote/${token}/contract`, label: "계약서", available: hasContract },
    { href: `/quote/${token}/proposal`, label: "제안서", available: hasProposal },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200" role="tablist" aria-label="프로젝트 문서">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;

        if (!tab.available) {
          return (
            <span
              key={tab.href}
              role="tab"
              aria-disabled
              className="cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-slate-300"
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={isActive}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              isActive ? "border-primary text-primary" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
