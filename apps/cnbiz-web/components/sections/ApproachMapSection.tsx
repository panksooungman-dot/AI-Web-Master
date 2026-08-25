import { Container, Section } from "@cnbiz/layout-primitives";
import { IconBadge } from "@cnbiz/ui";
import { AiIcon, CloudIcon, ConsultingIcon, DevelopmentIcon, TrendingUpIcon } from "@/components/icons/ServiceIcons";
import { componentMarker } from "@/lib/dev/component-marker";

const inputs = [
  { icon: ConsultingIcon, label: "디지털 전환 컨설팅", tone: "indigo" as const },
  { icon: AiIcon, label: "AI / ML 솔루션", tone: "violet" as const },
  { icon: DevelopmentIcon, label: "엔터프라이즈 개발", tone: "blue" as const },
  { icon: CloudIcon, label: "클라우드 인프라", tone: "cyan" as const },
];

export function ApproachMapSection() {
  return (
    <Section
      {...componentMarker("ApproachMapSection", "components/sections/ApproachMapSection.tsx", "접근 방식 다이어그램")}
      background="white"
      blendFrom="dark"
    >
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            How CNBIZ Works
          </p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            4가지 전문 역량을 하나의 파트너십으로 연결합니다
          </h2>
        </div>

        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-stretch lg:gap-6">
          <div className="grid w-full grid-cols-2 gap-4 lg:w-auto lg:flex-1">
            {inputs.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-5 text-center shadow-sm shadow-slate-900/5"
              >
                <IconBadge tone={item.tone}>
                  <item.icon className="h-5 w-5" />
                </IconBadge>
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="hidden w-12 shrink-0 items-center justify-center lg:flex" aria-hidden>
            <div className="h-px w-full border-t-2 border-dashed border-primary/30" />
          </div>
          <div className="flex w-full justify-center lg:hidden" aria-hidden>
            <div className="h-8 w-px border-l-2 border-dashed border-primary/30" />
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center gap-3">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-indigo-500 to-primary-dark text-lg font-bold text-white shadow-md shadow-primary/25">
              CNBIZ
            </div>
          </div>

          <div className="hidden w-12 shrink-0 items-center justify-center lg:flex" aria-hidden>
            <div className="h-px w-full border-t-2 border-dashed border-primary/30" />
          </div>
          <div className="flex w-full justify-center lg:hidden" aria-hidden>
            <div className="h-8 w-px border-l-2 border-dashed border-primary/30" />
          </div>

          <div className="flex w-full items-center lg:w-auto lg:flex-1">
            <div className="flex w-full flex-col items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-br from-primary-light/15 to-primary/10 p-6 text-center shadow-sm shadow-primary/10">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white">
                <TrendingUpIcon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-slate-900">고객의 지속가능한 성장</p>
              <p className="text-xs leading-relaxed text-slate-600">
                네 가지 역량이 하나의 파트너십으로 이어져 실질적인 비즈니스 성과를 만듭니다.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
