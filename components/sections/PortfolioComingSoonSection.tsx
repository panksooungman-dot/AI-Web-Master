import Link from "next/link";

export default function PortfolioComingSoonSection() {
  return (
    <section className="relative overflow-hidden bg-secondary text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-light tracking-widest uppercase mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-light" aria-hidden />
          Portfolio
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
          더 나은 사례로
          <br />
          <span className="text-primary-light">곧 찾아뵙겠습니다</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          CNBIZ가 함께한 프로젝트와 성과를 담은 포트폴리오 페이지를 준비하고
          있습니다. 서비스가 궁금하시다면 아래에서 먼저 확인해보세요.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/services"
            className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
          >
            사업소개 보기
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-white px-8 text-base font-semibold text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
          >
            문의하기
          </Link>
        </div>
      </div>
    </section>
  );
}
