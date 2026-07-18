import { Container, Section } from "@cnbiz/layout-primitives";

export function RequestHeroSection() {
  return (
    <Section background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      </div>

      <Container className="relative">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
          Project Request
        </p>

        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          홈페이지 제작을
          <br />
          <span className="text-primary-light">지금 의뢰해보세요</span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          아래 양식에 필요한 정보를 남겨주시면, 담당자가 내용을 검토한 뒤 영업일 기준
          24시간 이내에 연락드립니다.
        </p>
      </Container>
    </Section>
  );
}
