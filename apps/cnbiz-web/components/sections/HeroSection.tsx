import Image from "next/image";
import { Container, Section } from "@cnbiz/layout-primitives";
import { IconBadge, LinkButton } from "@cnbiz/ui";
import { AiIcon, CloudIcon, ConsultingIcon, DevelopmentIcon } from "@/components/icons/ServiceIcons";
import { CNBIZ_AI_URL } from "@/lib/links";
import { componentMarker } from "@/lib/dev/component-marker";

const HERO_SHOWCASE_MASK =
  "radial-gradient(ellipse 60% 60% at 65% 40%, black 0%, transparent 70%)";

const services = [
  { icon: ConsultingIcon, label: "디지털 전환 컨설팅", tone: "indigo" as const },
  { icon: AiIcon, label: "AI / ML 솔루션", tone: "violet" as const },
  { icon: DevelopmentIcon, label: "엔터프라이즈 개발", tone: "blue" as const },
  { icon: CloudIcon, label: "클라우드 인프라", tone: "cyan" as const },
];

export function HeroSection() {
  return (
    <Section {...componentMarker("HeroSection", "components/sections/HeroSection.tsx", "메인 히어로")} background="dark" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 hidden opacity-[0.14] lg:block"
          style={{ maskImage: HERO_SHOWCASE_MASK, WebkitMaskImage: HERO_SHOWCASE_MASK }}
        >
          <Image src="/images/hero-showcase.jpg" alt="" fill className="object-cover" />
        </div>
        <div className="absolute -top-48 -right-48 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 h-96 w-96 rounded-full bg-gradient-to-tr from-violet-500/10 to-primary-light/10 blur-3xl" />
        <svg
          aria-hidden
          className="absolute -right-16 top-0 hidden h-full w-[480px] lg:block"
          viewBox="0 0 480 640"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hero-ribbon-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4F9DE0" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#005BAC" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hero-ribbon-b" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4F9DE0" stopOpacity="0" />
            </linearGradient>
            <filter id="hero-ribbon-blur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
          </defs>
          <g filter="url(#hero-ribbon-blur)">
            <rect
              x="160"
              y="-120"
              width="90"
              height="820"
              rx="45"
              fill="url(#hero-ribbon-a)"
              transform="rotate(20 205 300)"
            />
            <rect
              x="260"
              y="-160"
              width="46"
              height="860"
              rx="23"
              fill="url(#hero-ribbon-b)"
              transform="rotate(20 283 300)"
            />
          </g>
        </svg>
      </div>

      <Container className="relative">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-primary-light">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-light" />
              Digital Transformation Partner
            </p>

            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              디지털 혁신으로
              <br />
              <span className="text-primary-light">비즈니스의 미래</span>를 열다
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg lg:text-xl">
              CNBIZ는 기업의 디지털 전환을 이끄는 IT 전문 기업입니다. 최신 기술과 깊은 산업
              이해를 바탕으로 고객의 성장을 함께 설계합니다.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <LinkButton href="/services">서비스 알아보기</LinkButton>
              <LinkButton href={CNBIZ_AI_URL} variant="secondary">
                AI 홈페이지 무료 제작
              </LinkButton>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-primary-light">
                Core Services
              </p>
              <div className="grid grid-cols-2 gap-3">
                {services.map((service) => (
                  <div
                    key={service.label}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-primary-light/40"
                  >
                    <IconBadge tone={service.tone} size="sm" onDark>
                      <service.icon className="h-5 w-5" />
                    </IconBadge>
                    <p className="text-sm font-semibold text-white">{service.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-5 text-sm text-slate-300">
                <svg aria-hidden className="h-4 w-4 shrink-0 text-primary-light" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                영업일 기준 24시간 이내 답변드립니다
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
