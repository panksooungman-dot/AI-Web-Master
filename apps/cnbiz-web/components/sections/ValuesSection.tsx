import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";

const values = [
  { title: "전문성", desc: "각 분야 최고 전문가들이 검증된 방법론으로 문제를 해결합니다." },
  { title: "신뢰성", desc: "엄격한 품질 기준과 검증된 프로세스로 약속한 결과를 반드시 전달합니다." },
  { title: "혁신성", desc: "최신 기술을 선제적으로 도입해 고객의 경쟁력을 한 단계 높입니다." },
  { title: "파트너십", desc: "단기 프로젝트를 넘어 고객과 함께 성장하는 관계를 지향합니다." },
];

export function ValuesSection() {
  return (
    <Section background="white" id="values">
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Vision &amp; Mission
          </p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            우리가 나아가는 방향
          </h2>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Vision</p>
            <h3 className="mb-2 text-xl font-bold text-slate-900">디지털로 만드는 더 나은 비즈니스</h3>
            <p className="leading-relaxed text-slate-600">
              모든 기업이 디지털 기술을 통해 본질적인 경쟁력을 갖추는 세상을 만듭니다.
            </p>
          </Card>
          <Card>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Mission</p>
            <h3 className="mb-2 text-xl font-bold text-slate-900">고객의 성장을 함께 설계하는 파트너</h3>
            <p className="leading-relaxed text-slate-600">
              깊은 산업 이해와 최신 기술을 바탕으로 고객의 문제를 함께 고민하고 해결합니다.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {values.map((item) => (
            <Card key={item.title} className="text-center">
              <h3 className="font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
