import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

export function BrandStatementSection() {
  return (
    <Section
      {...componentMarker("BrandStatementSection", "components/sections/BrandStatementSection.tsx", "브랜드 스테이트먼트")}
      background="white"
      className="py-16 sm:py-20"
    >
      <Container className="text-center">
        <p className="mx-auto max-w-3xl bg-gradient-to-r from-primary via-primary-light to-primary bg-clip-text text-3xl font-bold leading-tight tracking-tight text-transparent sm:text-4xl lg:text-5xl">
          Digital Transformation Partner
        </p>
        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-500">
          CNBIZ는 기업의 디지털 혁신 여정에서 가장 신뢰할 수 있는 동반자입니다.
        </p>
      </Container>
    </Section>
  );
}
