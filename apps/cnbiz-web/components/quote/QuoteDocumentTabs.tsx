"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface QuoteDocumentTabsProps {
  token: string;
  hasEstimate: boolean;
  hasSpecification: boolean;
  hasTimeline: boolean;
}

/**
 * 견적서/기능명세서/프로젝트 타임라인을 각각 별도 페이지(문서만 출력)로 오갈 수 있는 탭
 * 내비게이션. 문서가 아직 생성되지 않은 종류는 비활성 탭으로 표시한다. `/quote/[token]`
 * (견적서)·`/quote/[token]/specification`·`/quote/[token]/timeline` 세 페이지가 공유한다.
 */
export function QuoteDocumentTabs({ token, hasEstimate, hasSpecification, hasTimeline }: QuoteDocumentTabsProps) {
  const pathname = usePathname();

  const tabs = [
    { href: `/quote/${token}`, label: "견적서", available: hasEstimate },
    { href: `/quote/${token}/specification`, label: "기능명세서", available: hasSpecification },
    { href: `/quote/${token}/timeline`, label: "프로젝트 타임라인", available: hasTimeline },
  ];

  return (
    <div className="mt-6 flex gap-1 border-b border-slate-200" role="tablist" aria-label="프로젝트 문서">
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
