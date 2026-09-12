import { Container } from "@cnbiz/layout-primitives";

interface PageHeroProps {
  eyebrow: string;
  title: string;
  description?: string;
}

/** 내부 페이지(메뉴/음식/매장/모임/지역/후기/오시는 길/예약) 공통 상단 헤더. */
export function PageHero({ eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="bg-secondary/40 py-16 sm:py-20">
      <Container className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">{eyebrow}</span>
        <h1 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
        {description ? <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted">{description}</p> : null}
      </Container>
    </section>
  );
}
