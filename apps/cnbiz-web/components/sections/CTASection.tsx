import { Container, Section } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { CNBIZ_AI_URL } from "@/lib/links";
import { componentMarker } from "@/lib/dev/component-marker";

export function CTASection() {
  return (
    <Section {...componentMarker("CTASection", "components/sections/CTASection.tsx", "문의 유도 배너")} background="dark">
      <Container>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-900 px-6 py-14 text-center shadow-lg shadow-primary/10 sm:px-12">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-light/20 blur-3xl" />
          <div className="relative">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
              AI Website Builder
            </p>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              AI가 홈페이지를 자동으로 제작해드립니다
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
              몇 가지 질문에 답하면 AI가 홈페이지 제작을 시작합니다.
            </p>
            <div className="mt-8 flex justify-center">
              <LinkButton href={CNBIZ_AI_URL}>AI 홈페이지 무료 제작</LinkButton>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
