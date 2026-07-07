import Link from "next/link";
import { componentMarker } from "@/lib/dev/component-marker";

const services = [
  {
    href: "/services#consulting",
    icon: (
      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
    title: "디지털 전환 컨설팅",
    desc: "기업의 현황 분석부터 디지털 전환 전략 수립 및 실행까지 전 과정을 지원합니다.",
    features: ["현황 진단 및 갭 분석", "전략 로드맵 수립", "변화 관리 지원"],
  },
  {
    href: "/services#ai",
    icon: (
      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
    title: "AI / ML 솔루션",
    desc: "머신러닝, 자연어 처리, 컴퓨터 비전 등 AI 기술을 실무에 접목합니다.",
    features: ["예측 분석 모델 개발", "AI 기반 업무 자동화", "LLM 챗봇 구축"],
  },
  {
    href: "/services#development",
    icon: (
      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
    title: "엔터프라이즈 개발",
    desc: "대규모 기업 시스템부터 모바일 앱까지, 확장성 있는 솔루션을 구축합니다.",
    features: ["웹 / 모바일 개발", "ERP · CRM 연동", "MSA 아키텍처 설계"],
  },
  {
    href: "/services#cloud",
    icon: (
      <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
      </svg>
    ),
    title: "클라우드 인프라",
    desc: "AWS · Azure · GCP 기반의 안정적이고 비용 효율적인 클라우드 환경을 구성합니다.",
    features: ["클라우드 마이그레이션", "DevOps / CI-CD 자동화", "보안 · 컴플라이언스"],
  },
];

export default function ServicesSection() {
  return (
    <section
      id="services"
      className="py-24 bg-slate-50"
      {...componentMarker("ServicesSection", "components/sections/ServicesSection.tsx")}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-blue-600 text-sm font-semibold tracking-widest uppercase mb-3">
            Services
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            비즈니스 성장을 위한<br />전문 서비스
          </h2>
          <p className="mt-4 text-slate-600 text-lg">
            CNBIZ의 전문 서비스로 귀사의 디지털 경쟁력을 높이세요.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <Link
              key={service.href}
              href={service.href}
              className="group flex flex-col rounded-2xl bg-white border border-slate-100 p-6 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200"
            >
              <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                {service.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{service.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">{service.desc}</p>
              <ul className="space-y-2 mt-auto">
                {service.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all duration-200">
                자세히 보기
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
