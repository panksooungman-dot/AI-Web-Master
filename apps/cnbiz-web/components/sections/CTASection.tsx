import { Container, Section } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { CNBIZ_AI_URL, CNBIZ_QUOTE_URL } from "@/lib/links";
import { componentMarker } from "@/lib/dev/component-marker";

interface CTASectionProps {
  blendFrom?: "white" | "alt" | "dark";
}

export function CTASection({ blendFrom }: CTASectionProps) {
  return (
    <Section
      {...componentMarker("CTASection", "components/sections/CTASection.tsx", "문의 유도 배너")}
      background="dark"
      blendFrom={blendFrom}
    >
      <Container>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-slate-900 to-slate-900 px-6 py-14 text-center shadow-lg shadow-primary/10 sm:px-12">
          <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-br from-primary-light/25 to-indigo-400/15 blur-3xl" />
          <div className="relative">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
              Project Inquiry
            </p>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
              프로젝트를 상담해보세요
            </h2>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
              디지털 전환 컨설팅부터 AI·개발·클라우드까지, 담당자가 확인 후 영업일 기준
              24시간 이내 답변드립니다.
            </p>
            <div className="mt-8 flex justify-center">
              <LinkButton href={CNBIZ_QUOTE_URL}>프로젝트 문의하기</LinkButton>
            </div>
            <p className="mt-6 text-sm text-slate-400">
              간단한 홈페이지가 빠르게 필요하다면{" "}
              <a href={CNBIZ_AI_URL} className="font-medium text-primary-light underline underline-offset-2 hover:text-white">
                AI 홈페이지 무료 제작 서비스
              </a>
              도 이용해보세요.
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
