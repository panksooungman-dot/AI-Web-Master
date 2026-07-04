import { Container, Section } from "@cnbiz/layout-primitives";

export function ServicesHeroSection() {
  return (
    <Section background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <Container className="relative">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
          Our Services
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          디지털 전환의 모든 단계를
          <br />
          <span className="text-primary-light">함께 설계합니다</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          컨설팅부터 AI·개발·클라우드까지, 고객의 비즈니스 문제에 맞는 솔루션을
          제공합니다.
        </p>
      </Container>
    </Section>
  );
}
