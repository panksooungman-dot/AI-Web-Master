import Link from "next/link";
import { componentMarker } from "@/lib/dev/component-marker";

const portfolios = [
  {
    category: "금융",
    categoryColor: "bg-blue-100 text-blue-700",
    title: "대형 은행 디지털 뱅킹 플랫폼 구축",
    desc: "노후화된 레거시 시스템을 마이크로서비스 아키텍처로 전환하고 모바일 뱅킹 앱을 새롭게 개발했습니다.",
    tags: ["마이크로서비스", "모바일 앱", "API 설계"],
    result: "처리 속도 40% 향상",
    accentColor: "border-blue-200 bg-blue-50",
    resultColor: "text-blue-600",
  },
  {
    category: "유통 · 이커머스",
    categoryColor: "bg-violet-100 text-violet-700",
    title: "이커머스 플랫폼 AI 개인화 추천 시스템",
    desc: "머신러닝 기반 개인화 추천 엔진을 구축하여 고객 경험을 개선하고 매출 전환율을 크게 높였습니다.",
    tags: ["ML 추천 엔진", "데이터 분석", "A/B 테스트"],
    result: "구매 전환율 25% 증가",
    accentColor: "border-violet-200 bg-violet-50",
    resultColor: "text-violet-600",
  },
  {
    category: "제조",
    categoryColor: "bg-emerald-100 text-emerald-700",
    title: "스마트 팩토리 IoT 통합 모니터링 플랫폼",
    desc: "생산 설비에 IoT 센서를 연동하고 실시간 모니터링 대시보드를 구축하여 운영 효율을 크게 높였습니다.",
    tags: ["IoT 연동", "실시간 대시보드", "예지 보전"],
    result: "설비 가동률 15% 개선",
    accentColor: "border-emerald-200 bg-emerald-50",
    resultColor: "text-emerald-600",
  },
];

export default function PortfolioSection() {
  return (
    <section
      id="portfolio"
      className="py-24 bg-white"
      {...componentMarker("PortfolioSection", "components/sections/PortfolioSection.tsx")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <div>
            <p className="text-blue-600 text-sm font-semibold tracking-widest uppercase mb-3">
              Portfolio
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
              실력으로 증명한<br />프로젝트 성과
            </h2>
          </div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:gap-3 transition-all duration-200 shrink-0"
          >
            전체 포트폴리오 보기
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolios.map((item) => (
            <article
              key={item.title}
              className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
            >
              {/* Placeholder image area */}
              <div className={`h-44 w-full ${item.accentColor} flex items-center justify-center border-b border-slate-100`}>
                <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>

              <div className="flex flex-col flex-1 p-6">
                {/* Category badge */}
                <span className={`self-start inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.categoryColor} mb-3`}>
                  {item.category}
                </span>

                <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">{item.desc}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Result */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">주요 성과</span>
                  <span className={`text-sm font-bold ${item.resultColor}`}>{item.result}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
