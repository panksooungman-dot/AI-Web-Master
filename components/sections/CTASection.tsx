import Link from "next/link";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-slate-900 py-24">
      {/* Decorative blob */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-blue-600/15 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-4">
          Get Started
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
          프로젝트를 시작할<br />준비가 되셨나요?
        </h2>
        <p className="mt-5 text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          CNBIZ 전문 컨설턴트가 귀사의 요구사항을 분석하고
          최적의 솔루션을 제안해 드립니다. 첫 상담은 무료입니다.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/contact"
            className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-xl bg-blue-600 px-10 text-base font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            무료 상담 신청하기
          </Link>
          <Link
            href="/about"
            className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-xl border border-white/20 bg-white/10 px-10 text-base font-semibold text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            회사 소개 보기
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            초기 상담 무료
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            영업일 24시간 내 응답
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            NDA 보안 계약 가능
          </span>
        </div>
      </div>
    </section>
  );
}
