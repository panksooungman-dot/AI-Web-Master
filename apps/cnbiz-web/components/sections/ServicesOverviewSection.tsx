import Link from "next/link";
import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";

const services = [
  {
    href: "/services#consulting",
    title: "디지털 전환 컨설팅",
    desc: "현황 분석부터 전략 수립까지, 디지털 전환의 방향을 함께 설계합니다.",
  },
  {
    href: "/services#ai",
    title: "AI / ML 솔루션",
    desc: "머신러닝과 생성형 AI 기술을 실제 비즈니스 문제에 접목합니다.",
  },
  {
    href: "/services#development",
    title: "엔터프라이즈 개발",
    desc: "대규모 시스템부터 모바일 앱까지, 확장성 있는 소프트웨어를 구축합니다.",
  },
  {
    href: "/services#cloud",
    title: "클라우드 인프라",
    desc: "AWS · Azure · GCP 기반의 안정적이고 비용 효율적인 환경을 구성합니다.",
  },
];

export function ServicesOverviewSection() {
  return (
    <Section background="alt">
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">What We Do</p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">4가지 핵심 서비스</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <Link key={service.href} href={service.href} className="group block">
              <Card className="flex h-full flex-col transition-colors group-hover:border-primary/30">
                <h3 className="mb-2 text-lg font-bold text-slate-900">{service.title}</h3>
                <p className="flex-1 text-sm leading-relaxed text-slate-600">{service.desc}</p>
                <p className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary transition-all group-hover:gap-2">
                  자세히 보기
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                  </svg>
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </Container>
    </Section>
  );
}
