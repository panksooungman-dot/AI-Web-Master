import Image from "next/image";
import { Container, Section } from "@cnbiz/layout-primitives";
import { componentMarker } from "@/lib/dev/component-marker";

const showcases = [
  {
    src: "/images/showcase-media.jpg",
    alt: "미디어·스트리밍 서비스 화면 예시",
    rotateClass: "sm:-rotate-2",
    aspectClass: "aspect-[1200/758]",
  },
  {
    src: "/images/showcase-furniture.jpg",
    alt: "가구·인테리어 쇼핑몰 화면 예시",
    rotateClass: "sm:rotate-2",
    aspectClass: "aspect-[1000/1022]",
  },
  {
    src: "/images/showcase-food.jpg",
    alt: "푸드·라이프스타일 브랜드 화면 예시",
    rotateClass: "sm:-rotate-1",
    aspectClass: "aspect-[1000/1010]",
  },
];

const galleryWall = [
  { src: "/images/showcase-wall-1.jpg", alt: "다양한 앱·이커머스 화면 모음 1" },
  { src: "/images/showcase-wall-2.jpg", alt: "다양한 앱·이커머스 화면 모음 2" },
  { src: "/images/showcase-wall-3.jpg", alt: "다양한 브랜드 화면 모음" },
  { src: "/images/showcase-wall-4.jpg", alt: "다양한 웹사이트 화면 모음 1" },
  { src: "/images/showcase-wall-5.jpg", alt: "다양한 웹사이트 화면 모음 2" },
];

export function ShowcaseSection() {
  return (
    <Section
      {...componentMarker("ShowcaseSection", "components/sections/ShowcaseSection.tsx", "화면 쇼케이스")}
      background="alt"
      blendFrom="white"
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

        <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-3">
          {showcases.map((item) => (
            <div
              key={item.src}
              className={`relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-lg shadow-slate-900/10 transition-transform duration-300 hover:rotate-0 hover:scale-[1.02] ${item.aspectClass} ${item.rotateClass}`}
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 33vw, 100vw"
              />
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 grid max-w-5xl items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {galleryWall.map((item) => (
            <div
              key={item.src}
              className="relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/5 transition-transform duration-300 hover:scale-[1.02]"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              />
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
