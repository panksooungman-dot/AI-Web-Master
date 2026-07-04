import { Container, Section } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";

export function CTASection() {
  return (
    <Section background="dark">
      <Container className="text-center">
        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
          프로젝트를 시작할 준비가 되셨나요?
        </h2>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-300">
          지금 바로 상담을 신청하시면 담당자가 영업일 기준 24시간 이내에 연락드립니다.
        </p>
        <div className="mt-8 flex justify-center">
          <LinkButton href="/contact">무료 상담 신청</LinkButton>
        </div>
      </Container>
    </Section>
  );
}
