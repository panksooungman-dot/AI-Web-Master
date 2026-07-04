import { Container, Section } from "@cnbiz/layout-primitives";
import { ContactForm } from "./ContactForm";

export function ContactFormSection() {
  return (
    <Section background="white" id="form">
      <Container>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Get in Touch
            </p>
            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
              문의 남기기
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-slate-600">
              이름, 연락처, 이메일과 문의 내용을 남겨주시면 담당자가 영업일 기준 24시간
              이내에 확인 후 연락드립니다.
            </p>
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
