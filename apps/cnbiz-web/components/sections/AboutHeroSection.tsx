import { Container, Section } from "@cnbiz/layout-primitives";

export function AboutHeroSection() {
  return (
    <Section background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <Container className="relative">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
          About CNBIZ
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          CNBIZ는 기업의 디지털 전환을 이끄는
          <br />
          <span className="text-primary-light">IT 전문 기업</span>입니다
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          국내외 다양한 산업군의 기업들이 디지털 시대에 경쟁력을 갖출 수 있도록 맞춤형 IT
          솔루션을 제공합니다. 단순한 개발 파트너를 넘어, 고객의 비즈니스를 깊이 이해하고
          장기적인 성장 전략을 함께 수립하는 신뢰할 수 있는 디지털 파트너를 지향합니다.
        </p>
      </Container>
    </Section>
  );
}
