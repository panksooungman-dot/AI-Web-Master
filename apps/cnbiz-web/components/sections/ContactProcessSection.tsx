import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

/**
 * 문의 접수 → 프로젝트 착수까지의 절차를 폼 작성 전에 짧게 안내한다. 문구는
 * ServiceProcessSection의 앞 4단계와 동일한 사실을 재사용한다(새 정책·수치를 지어내지 않음).
 */
const steps = [
  { step: "01", title: "상담 신청" },
  { step: "02", title: "요구사항 분석" },
  { step: "03", title: "제안 및 견적" },
  { step: "04", title: "프로젝트 착수" },
];

export function ContactProcessSection() {
  return (
    <Section
      {...componentMarker("ContactProcessSection", "components/sections/ContactProcessSection.tsx", "문의 절차 안내")}
      background="alt"
      blendFrom="dark"
      className="py-12"
    >
      <Container>
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-primary">
          문의하시면 이렇게 진행됩니다
        </p>
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
          {steps.map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {item.step}
              </span>
              <p className="mt-2 text-sm font-semibold text-slate-900">{item.title}</p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
