import Image from "next/image";
import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

const showcases = [
  { src: "/images/showcase-wall-1.jpg", alt: "다양한 앱·이커머스 화면 모음 1", aspectClass: "aspect-[4/3]" },
  { src: "/images/showcase-wall-2.jpg", alt: "다양한 앱·이커머스 화면 모음 2", aspectClass: "aspect-[4/3]" },
  { src: "/images/showcase-wall-3.jpg", alt: "다양한 브랜드 화면 모음", aspectClass: "aspect-[4/3]" },
  { src: "/images/showcase-wall-4.jpg", alt: "다양한 웹사이트 화면 모음 1", aspectClass: "aspect-[4/3]" },
  { src: "/images/showcase-wall-5.jpg", alt: "다양한 웹사이트 화면 모음 2", aspectClass: "aspect-[4/3]" },
];

export function ShowcaseSection() {
  return (
    <Section
      {...componentMarker("ShowcaseSection", "components/sections/ShowcaseSection.tsx", "화면 쇼케이스")}
      background="white"
      blendFrom="alt"
    >
      <Container>
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Web Experience
          </p>
          <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            산업별로 다른 디지털 경험을 설계합니다
          </h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            미디어·커머스·라이프스타일 등 다양한 업종에 맞는 화면과 사용자 경험을 고민합니다.
          </p>
        </div>
      </Container>

      <div className="flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        <div aria-hidden className="w-[calc((100%-80rem)/2)] shrink-0 max-lg:hidden" />
        {showcases.map((item) => (
          <div
            key={item.src}
            className={`relative h-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-900/10 ${item.aspectClass}`}
          >
            <Image src={item.src} alt={item.alt} fill className="object-cover" sizes="400px" />
          </div>
        ))}
        <div aria-hidden className="w-[calc((100%-80rem)/2)] shrink-0 max-lg:hidden" />
      </div>
    </Section>
  );
}
