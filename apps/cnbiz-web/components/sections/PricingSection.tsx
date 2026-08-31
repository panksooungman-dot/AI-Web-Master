import Link from "next/link";
import { Container, Section } from "@cnbiz/layout-primitives";
import { Card } from "@cnbiz/ui";
import { componentMarker } from "@/lib/dev/component-marker";

interface PricingPlan {
  badge: string;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

const plans: PricingPlan[] = [
  {
    badge: "인기",
    name: "랜딩형 홈페이지",
    price: "25만원~",
    description: "고객 정보 수집에 최적화된 1페이지 사이트. 보험·대출·분양광고에 딱 맞아요.",
    features: ["1페이지 최적화 구성", "상담 신청 폼 내장", "모바일 완전 대응", "SEO 기본 설정", "빠른 제작 (5~7일)"],
  },
  {
    badge: "가장 많이 선택",
    name: "기업형 홈페이지",
    price: "40만원~",
    description: "신뢰감을 높이는 다페이지 기업 사이트. 회사 소개·포트폴리오·문의까지.",
    features: ["다페이지 구성", "회사 소개·팀 소개", "포트폴리오 갤러리", "온라인 문의 시스템", "납품 후 1개월 A/S"],
    highlighted: true,
  },
  {
    badge: "풀옵션",
    name: "프리미엄 홈페이지",
    price: "70만원~",
    description: "예약·결제·회원 관리까지 통합한 올인원 고급 솔루션.",
    features: ["예약·결제 시스템", "회원 가입·마이페이지", "관리자 페이지 제공", "블로그·공지사항", "전담 PM 배정"],
  },
  {
    badge: "커머스",
    name: "쇼핑몰 홈페이지",
    price: "100만원~",
    description: "상품 판매에 특화된 온라인 쇼핑몰. 결제·배송·재고 관리까지 한번에.",
    features: ["상품 등록 무제한", "결제 PG 연동", "주문·배송 관리", "재고·옵션 관리", "모바일 쇼핑 최적화"],
  },
];

interface PricingSectionProps {
  blendFrom?: "white" | "alt" | "dark";
}

export function PricingSection({ blendFrom }: PricingSectionProps) {
  return (
    <Section
      {...componentMarker("PricingSection", "components/sections/PricingSection.tsx", "가격표")}
      background="alt"
      blendFrom={blendFrom}
    >
      <Container>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">목적에 맞는 패키지 선택</h2>
          <p className="mt-4 leading-relaxed text-slate-600">업종과 목적에 따라 최적의 플랜을 골라보세요</p>
        </div>

        <div className="mx-auto mb-12 flex max-w-xl flex-col items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 py-4 text-center sm:flex-row sm:justify-center sm:gap-3">
          <span className="inline-flex shrink-0 items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
            지금 문의 시
          </span>
          <p className="text-base font-semibold text-slate-900">
            무료 견적 상담을 신청하면 <span className="text-primary">10만원 할인 쿠폰</span>을 드립니다
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const CardTag = plan.highlighted ? "div" : Card;
            const cardClassName = plan.highlighted
              ? "flex flex-col rounded-xl border border-primary bg-primary p-6 text-white shadow-lg shadow-primary/25"
              : "flex flex-col";
            return (
            <CardTag key={plan.name} className={cardClassName}>
              <span
                className={
                  plan.highlighted
                    ? "mb-4 inline-flex w-fit items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white"
                    : "mb-4 inline-flex w-fit items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                }
              >
                {plan.badge}
              </span>
              <h3 className={plan.highlighted ? "text-lg font-bold text-white" : "text-lg font-bold text-slate-900"}>
                {plan.name}
              </h3>
              <p
                className={
                  plan.highlighted ? "mt-3 text-3xl font-bold text-white" : "mt-3 text-3xl font-bold text-slate-900"
                }
              >
                {plan.price}
              </p>
              <p
                className={
                  plan.highlighted ? "mt-3 text-sm leading-relaxed text-white/85" : "mt-3 text-sm leading-relaxed text-slate-600"
                }
              >
                {plan.description}
              </p>
              <ul className="mt-5 flex flex-1 flex-col gap-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className={
                      plan.highlighted ? "flex items-start gap-2 text-sm text-white/90" : "flex items-start gap-2 text-sm text-slate-600"
                    }
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className={
                  plan.highlighted
                    ? "mt-6 inline-flex items-center justify-center gap-1 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-slate-50"
                    : "mt-6 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-slate-300 hover:bg-slate-50"
                }
              >
                무료 견적 받기
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </CardTag>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          위 금액은 기본 구성 기준이며, 세부 요구사항에 따라 견적이 달라질 수 있습니다.
        </p>
      </Container>
    </Section>
  );
}
