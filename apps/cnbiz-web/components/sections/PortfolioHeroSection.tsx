import { Container, Section } from "@cnbiz/layout-primitives";

export function PortfolioHeroSection() {
  return (
    <Section background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <Container className="relative">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
          Portfolio
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          더 나은 사례로
          <br />
          <span className="text-primary-light">곧 찾아뵙겠습니다</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          CNBIZ가 함께한 프로젝트와 성과를 담은 포트폴리오를 준비하고 있습니다.
          실제 사례는 확인 후 순차적으로 공개될 예정입니다.
        </p>
      </Container>
    </Section>
  );
}
