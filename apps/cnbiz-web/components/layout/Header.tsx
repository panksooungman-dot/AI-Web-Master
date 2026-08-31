import Link from "next/link";
import { LinkButton } from "@cnbiz/ui";
import { MobileMenu } from "./MobileMenu";
import { CNBIZ_AI_URL } from "@/lib/links";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link href="/" className="shrink-0">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            CN<span className="text-primary">BIZ</span>
          </span>
        </Link>

        <div className="hidden items-center gap-3 lg:flex">
          <LinkButton href={CNBIZ_AI_URL} target="_blank" rel="noopener noreferrer" variant="secondary">
            포트폴리오 보기
          </LinkButton>
          <LinkButton href="/contact">프로젝트 문의하기</LinkButton>
        </div>

        <MobileMenu />
      </div>
    </header>
  );
}
