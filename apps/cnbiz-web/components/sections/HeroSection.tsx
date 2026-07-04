import { Container, Section } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";

export function HeroSection() {
  return (
    <Section background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-primary-light/10 blur-3xl" />
      </div>

      <Container className="relative">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
          Digital Transformation Partner
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          디지털 혁신으로
          <br />
          <span className="text-primary-light">비즈니스의 미래</span>를 열다
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg lg:text-xl">
          CNBIZ는 기업의 디지털 전환을 이끄는 IT 전문 기업입니다. 최신 기술과 깊은 산업
          이해를 바탕으로 고객의 성장을 함께 설계합니다.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <LinkButton href="/services">서비스 알아보기</LinkButton>
          <LinkButton href="/contact" variant="secondary">
            무료 상담 신청
          </LinkButton>
        </div>
      </Container>
    </Section>
  );
}
