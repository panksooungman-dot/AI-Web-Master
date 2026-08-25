import type { SVGProps } from "react";
import { Container, Section } from "@cnbiz/layout-primitives";
import { Card, IconBadge } from "@cnbiz/ui";
import { componentMarker } from "@/lib/dev/component-marker";

function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.563.563 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}

function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12c0 4.556-3.04 8.394-7.201 9.61a1.06 1.06 0 0 1-.598 0C9.04 20.394 6 16.556 6 12V6.5a1 1 0 0 1 .5-.866l5.25-3.03a1 1 0 0 1 1 0l5.25 3.03a1 1 0 0 1 .5.866V12Z"
      />
    </svg>
  );
}

function BoltIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5 14.25 2.25 12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

function PartnershipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor" {...props}>
      <circle cx="9" cy="12" r="5.25" />
      <circle cx="15" cy="12" r="5.25" />
    </svg>
  );
}

const values = [
  { icon: StarIcon, tone: "violet" as const, title: "전문성", desc: "각 분야 최고 전문가들이 검증된 방법론으로 문제를 해결합니다." },
  { icon: ShieldCheckIcon, tone: "blue" as const, title: "신뢰성", desc: "엄격한 품질 기준과 검증된 프로세스로 약속한 결과를 반드시 전달합니다." },
  { icon: BoltIcon, tone: "cyan" as const, title: "혁신성", desc: "최신 기술을 선제적으로 도입해 고객의 경쟁력을 한 단계 높입니다." },
  { icon: PartnershipIcon, tone: "indigo" as const, title: "파트너십", desc: "단기 프로젝트를 넘어 고객과 함께 성장하는 관계를 지향합니다." },
];

export function MissionVisionSection() {
  return (
    <Section
      {...componentMarker("MissionVisionSection", "components/sections/MissionVisionSection.tsx", "미션·비전")}
      background="alt"
      blendFrom="white"
      id="values"
    >
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Mission &amp; Vision
          </p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            우리가 나아가는 방향
          </h2>
        </div>

        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <Card>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Mission</p>
            <h3 className="mb-2 text-xl font-bold text-slate-900">고객의 성장을 함께 설계하는 파트너</h3>
            <p className="leading-relaxed text-slate-600">
              깊은 산업 이해와 최신 기술을 바탕으로 고객의 문제를 함께 고민하고 해결합니다.
            </p>
          </Card>
          <Card>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Vision</p>
            <h3 className="mb-2 text-xl font-bold text-slate-900">디지털로 만드는 더 나은 비즈니스</h3>
            <p className="leading-relaxed text-slate-600">
              모든 기업이 디지털 기술을 통해 본질적인 경쟁력을 갖추는 세상을 만듭니다.
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {values.map((item) => (
            <Card key={item.title} className="flex flex-col items-center text-center">
              <IconBadge tone={item.tone} size="lg">
                <item.icon className="h-6 w-6" />
              </IconBadge>
              <h3 className="mt-4 font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}
