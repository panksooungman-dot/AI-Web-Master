"use client";

import Link from "next/link";
import { useState } from "react";
import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { componentMarker } from "@/lib/dev/component-marker";

type Category = "랜딩형" | "기업형" | "프리미엄" | "쇼핑몰";

interface ProjectType {
  category: Category;
  industry: string;
  title: string;
}

const CATEGORIES: Category[] = ["랜딩형", "기업형", "프리미엄", "쇼핑몰"];

const projectTypes: ProjectType[] = [
  { category: "랜딩형", industry: "병원·의원", title: "병원·의원 랜딩페이지" },
  { category: "랜딩형", industry: "금융·보험", title: "금융·보험 랜딩페이지" },
  { category: "기업형", industry: "인테리어·시공", title: "인테리어 기업 홈페이지" },
  { category: "기업형", industry: "법무·세무", title: "법무·세무 기업 사이트" },
  { category: "프리미엄", industry: "뷰티·미용", title: "뷰티·미용 예약 시스템" },
  { category: "프리미엄", industry: "교육·학원", title: "학원 회원 관리 사이트" },
  { category: "쇼핑몰", industry: "패션·의류", title: "패션·의류 쇼핑몰" },
  { category: "쇼핑몰", industry: "식품·건강", title: "식품·건강 쇼핑몰" },
];

function BrowserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <rect x="2.75" y="4.75" width="18.5" height="14.5" rx="1.75" />
      <path strokeLinecap="round" d="M2.75 8.75h18.5" />
      <circle cx="5.5" cy="6.75" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="6.75" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface PortfolioTypesSectionProps {
  blendFrom?: "white" | "alt" | "dark";
}

export function PortfolioTypesSection({ blendFrom }: PortfolioTypesSectionProps) {
  const [selected, setSelected] = useState<Category | "전체">("전체");

  const filtered = selected === "전체" ? projectTypes : projectTypes.filter((item) => item.category === selected);

  return (
    <Section
      {...componentMarker("PortfolioTypesSection", "components/sections/PortfolioTypesSection.tsx", "제작 가능한 프로젝트 유형")}
      background="white"
      blendFrom={blendFrom}
    >
      <Container>
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Project Types</p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            다양한 업종에 맞춰 제작합니다
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            아래는 제작 가능한 프로젝트 유형 예시입니다. 실제 진행 사례는 프로젝트 확정 후 순차적으로 공개할 예정입니다.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {(["전체", ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelected(cat)}
              aria-pressed={selected === cat}
              className={
                selected === cat
                  ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors"
                  : "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300"
              }
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <Card key={item.title} className="flex flex-col items-start">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BrowserIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {item.category}
              </span>
              <p className="text-xs font-medium text-slate-500">{item.industry}</p>
              <h3 className="mt-1 text-base font-bold text-slate-900">{item.title}</h3>
            </Card>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            포트폴리오 더 보기
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
