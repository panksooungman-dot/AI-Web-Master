export default function ServicesHeroSection() {
  return (
    <section className="relative overflow-hidden bg-secondary text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-light tracking-widest uppercase mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-light" aria-hidden />
          Services
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
          비즈니스 성장을 위한
          <br />
          <span className="text-primary-light">전문 서비스</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          컨설팅부터 AI, 개발, 인프라까지. CNBIZ는 디지털 전환의 각 단계에
          필요한 전문성을 하나의 팀으로 제공합니다.
        </p>
      </div>
    </section>
  );
}
