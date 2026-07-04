import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";

const overview = [
  { label: "회사명", value: "CNBIZ" },
  { label: "업종", value: "IT / 비즈니스 솔루션" },
  {
    label: "대표 서비스",
    value: "디지털 전환 컨설팅 · AI/ML 솔루션 · 엔터프라이즈 개발 · 클라우드 인프라",
  },
];

export function CompanyOverviewSection() {
  return (
    <Section background="white" id="overview">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              회사 개요
            </p>
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              디지털 시대의 경쟁력을
              <br />
              함께 만드는 파트너
            </h2>
            <p className="mt-6 leading-relaxed text-slate-600">
              CNBIZ는 국내외 다양한 산업군의 기업들이 디지털 시대에 경쟁력을 갖출 수
              있도록 맞춤형 IT 솔루션을 제공합니다. 단순한 개발 파트너를 넘어, 고객의
              비즈니스를 깊이 이해하고 장기적인 성장 전략을 함께 수립하는 신뢰할 수 있는
              디지털 파트너를 지향합니다.
            </p>
          </div>

          <Card className="p-0">
            <dl className="divide-y divide-slate-100">
              {overview.map((item) => (
                <div key={item.label} className="grid grid-cols-3 gap-4 px-6 py-5">
                  <dt className="text-sm font-semibold text-slate-900">{item.label}</dt>
                  <dd className="col-span-2 text-sm leading-relaxed text-slate-600">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </Container>
    </Section>
  );
}
