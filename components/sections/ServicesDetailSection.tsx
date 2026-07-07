import { componentMarker } from "@/lib/dev/component-marker";

const services = [
  {
    id: "consulting",
    label: "Digital Transformation Consulting",
    title: "디지털 전환 컨설팅",
    desc: "기업의 현황을 정확히 진단하고, 데이터에 기반한 디지털 전환 전략과 실행 로드맵을 함께 수립합니다. 조직의 변화 관리까지 책임지고 지원합니다.",
    features: [
      "현황 진단 및 갭 분석",
      "디지털 전환 전략 로드맵 수립",
      "변화 관리 및 조직 역량 강화",
      "성과 측정 체계 구축",
    ],
  },
  {
    id: "ai",
    label: "AI / ML Solutions",
    title: "AI / ML 솔루션",
    desc: "머신러닝과 생성형 AI 기술을 실제 비즈니스 문제에 접목해 실질적인 성과를 만듭니다. 데이터 수집부터 모델 운영까지 전 과정을 지원합니다.",
    features: [
      "예측 분석 모델 개발",
      "AI 기반 업무 자동화",
      "LLM 기반 챗봇 · 에이전트 구축",
      "데이터 파이프라인 설계",
    ],
  },
  {
    id: "development",
    label: "Enterprise Development",
    title: "엔터프라이즈 개발",
    desc: "웹·모바일부터 대규모 백엔드 시스템까지, 확장 가능하고 안정적인 소프트웨어를 구축합니다. 레거시 시스템의 현대화도 함께 지원합니다.",
    features: [
      "웹 / 모바일 애플리케이션 개발",
      "ERP · CRM 시스템 연동",
      "MSA(마이크로서비스) 아키텍처 설계",
      "레거시 시스템 현대화",
    ],
  },
  {
    id: "cloud",
    label: "Cloud Infrastructure",
    title: "클라우드 인프라",
    desc: "AWS · Azure · GCP 기반의 안정적이고 비용 효율적인 클라우드 환경을 설계하고 운영합니다. 보안과 컴플라이언스를 기본으로 갖춥니다.",
    features: [
      "클라우드 마이그레이션",
      "DevOps / CI-CD 파이프라인 구축",
      "보안 · 컴플라이언스 체계 수립",
      "24시간 모니터링 및 운영 지원",
    ],
  },
];

export default function ServicesDetailSection() {
  return (
    <>
      {services.map((service, index) => (
        <section
          key={service.id}
          id={service.id}
          className={`scroll-mt-20 py-24 ${index % 2 === 1 ? "bg-slate-50" : "bg-white"}`}
          {...componentMarker("ServicesDetailSection", "components/sections/ServicesDetailSection.tsx")}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              <div>
                <p className="text-primary text-sm font-semibold tracking-widest uppercase mb-3">
                  {service.label}
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
                  {service.title}
                </h2>
                <p className="mt-5 text-slate-600 text-lg leading-relaxed">
                  {service.desc}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 shadow-md p-6 sm:p-8">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  주요 제공 범위
                </h3>
                <ul className="space-y-3">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-slate-700">
                      <svg className="h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
