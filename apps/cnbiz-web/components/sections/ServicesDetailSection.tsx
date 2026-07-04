import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";

const services = [
  {
    id: "consulting",
    title: "디지털 전환 컨설팅",
    desc: "기업의 현황을 정확히 진단하고, 데이터에 기반한 디지털 전환 전략과 실행 로드맵을 함께 수립합니다.",
    scope: ["현황 진단 및 갭 분석", "전환 전략 로드맵 수립", "변화 관리", "성과 측정 체계 구축"],
  },
  {
    id: "ai",
    title: "AI / ML 솔루션",
    desc: "머신러닝과 생성형 AI 기술을 실제 비즈니스 문제에 접목해 실질적인 성과를 만듭니다.",
    scope: ["예측 분석 모델 개발", "AI 기반 업무 자동화", "LLM 챗봇/에이전트 구축", "데이터 파이프라인 설계"],
  },
  {
    id: "development",
    title: "엔터프라이즈 개발",
    desc: "웹·모바일부터 대규모 백엔드 시스템까지, 확장 가능하고 안정적인 소프트웨어를 구축합니다.",
    scope: ["웹/모바일 앱 개발", "ERP·CRM 연동", "MSA 아키텍처 설계", "레거시 현대화"],
  },
  {
    id: "cloud",
    title: "클라우드 인프라",
    desc: "AWS·Azure·GCP 기반의 안정적이고 비용 효율적인 클라우드 환경을 설계·운영합니다.",
    scope: ["클라우드 마이그레이션", "DevOps/CI-CD 구축", "보안·컴플라이언스", "24시간 모니터링"],
  },
];

export function ServicesDetailSection() {
  return (
    <Section background="white">
      <Container>
        <div className="space-y-8">
          {services.map((service) => (
            <Card key={service.id} id={service.id} className="scroll-mt-24 lg:p-8">
              <h2 className="text-2xl font-bold text-slate-900">{service.title}</h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">{service.desc}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {service.scope.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
