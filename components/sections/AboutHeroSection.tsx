import { componentMarker } from "@/lib/dev/component-marker";

export default function AboutHeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-secondary text-white"
      {...componentMarker("AboutHeroSection", "components/sections/AboutHeroSection.tsx")}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[800px] rounded-full bg-primary/20 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-light tracking-widest uppercase mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-light" aria-hidden />
          About CNBIZ
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
          고객의 성공을 함께 설계하는
          <br />
          <span className="text-primary-light">디지털 혁신 파트너</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
          CNBIZ는 2010년 설립 이래, 명확한 비전과 원칙을 바탕으로 고객과 함께
          성장해왔습니다. 우리가 걸어온 길과 지향하는 방향을 소개합니다.
        </p>
      </div>
    </section>
  );
}
