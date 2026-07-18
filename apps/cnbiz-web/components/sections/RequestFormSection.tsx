import { Container, Section } from "@cnbiz/layout-primitives";
import { RequestForm } from "./RequestForm";

export function RequestFormSection() {
  return (
    <Section background="white" id="form">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Get Started
            </p>
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              제작 의뢰 접수
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-slate-600">
              회사 정보와 원하시는 홈페이지에 대해 알려주시면, 요구사항에 맞춰
              구체적인 견적과 진행 방향을 안내해드립니다.
            </p>
          </div>

          <RequestForm />
        </div>
      </Container>
    </Section>
  );
}
