import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

export function ContactHeroSection() {
  return (
    <Section {...componentMarker("ContactHeroSection", "components/sections/ContactHeroSection.tsx", "문의하기 히어로")} background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <Container className="relative">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
          Contact
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          프로젝트에 대해
          <br />
          <span className="text-primary-light">편하게 문의해 주세요</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          아래 정보를 남겨주시면 담당자가 확인 후 순차적으로 연락드립니다.
        </p>

        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-medium text-slate-200">
          <svg aria-hidden className="h-4 w-4 text-primary-light" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          영업일 기준 24시간 이내 답변드립니다
        </p>
      </Container>
    </Section>
  );
}
