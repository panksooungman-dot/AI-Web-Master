import { Container, Section } from "@cnbiz/layout-primitives";

const steps = [
  { step: "01", title: "깊은 이해", desc: "고객의 산업과 비즈니스 목표를 깊이 있게 파악하는 것에서 시작합니다." },
  { step: "02", title: "함께 설계", desc: "축적된 경험과 데이터를 바탕으로 최적의 해결 방안을 함께 설계합니다." },
  { step: "03", title: "신뢰할 수 있는 실행", desc: "검증된 프로세스와 전문성으로 약속한 결과를 만들어냅니다." },
  { step: "04", title: "지속적인 동반자", desc: "프로젝트 완료 이후에도 지속적인 파트너십을 이어갑니다." },
];

export function AboutProcessSection() {
  return (
    <Section background="white">
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Our Approach
          </p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            우리가 일하는 방식
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="rounded-xl border border-slate-100 bg-white p-6 shadow-md">
              <p className="text-2xl font-bold text-primary/40">{item.step}</p>
              <h3 className="mt-3 font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
