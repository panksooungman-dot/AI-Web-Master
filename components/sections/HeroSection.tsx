import Link from "next/link";
import { componentMarker } from "@/lib/dev/component-marker";

const stats = [
  { value: "2010", label: "설립연도" },
  { value: "150+", label: "전문 인력" },
  { value: "500+", label: "완료 프로젝트" },
  { value: "200+", label: "고객사" },
];

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden bg-secondary text-white"
      {...componentMarker("HeroSection", "components/sections/HeroSection.tsx")}
    >
      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-primary-light/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
        {/* Badge */}
        <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary-light tracking-widest uppercase mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-primary-light" aria-hidden />
          Digital Transformation Partner
        </p>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight max-w-3xl">
          디지털 혁신으로
          <br />
          <span className="text-primary-light">비즈니스의 미래</span>를 열다
        </h1>

        {/* Sub-headline */}
        <p className="mt-6 text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl">
          CNBIZ는 기업의 디지털 전환을 이끄는 IT 전문 기업입니다.
          최신 기술과 깊은 산업 이해를 바탕으로 고객의 성장을 함께 설계합니다.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/services"
            className="inline-flex h-14 items-center justify-center rounded-lg bg-primary px-8 text-base font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
          >
            서비스 알아보기
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-14 items-center justify-center rounded-lg border border-slate-200 bg-white px-8 text-base font-semibold text-primary transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-secondary"
          >
            무료 상담 신청
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-16 pt-10 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl sm:text-4xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
