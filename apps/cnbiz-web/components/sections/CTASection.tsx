import { Container, Section } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { CNBIZ_AI_URL } from "@/lib/links";

export function CTASection() {
  return (
    <Section background="dark">
      <Container className="text-center">
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
          AI가 홈페이지를 자동으로 제작해드립니다
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
          몇 가지 질문에 답하면 AI가 홈페이지 제작을 시작합니다.
        </p>
        <div className="mt-8 flex justify-center">
          <LinkButton href={CNBIZ_AI_URL}>AI 홈페이지 무료 제작</LinkButton>
        </div>
      </Container>
    </Section>
  );
}
