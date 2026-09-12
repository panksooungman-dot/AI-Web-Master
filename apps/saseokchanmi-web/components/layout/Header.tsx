import Link from "next/link";
import { Container } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { NAV_ITEMS, RESERVATION_HREF, SITE_NAME } from "@/lib/site-config";
import { telUrl } from "@/lib/links";
import { MobileMenu } from "./MobileMenu";

/** 모바일 스토리보드(기획서 7장) 기준: 로고 + 메뉴 + 전화 아이콘. */
export function Header() {
  const phoneHref = telUrl();

  return (
    <header className="sticky top-0 z-40 border-b border-secondary bg-background/95 backdrop-blur-sm">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-primary">
          {SITE_NAME}
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {phoneHref ? (
            <a
              href={phoneHref}
              aria-label="전화 걸기"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-secondary text-primary sm:inline-flex"
            >
              <svg className="h-5 w-5" aria-hidden viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 0 1 2-2h2.28a1 1 0 0 1 .95.68l1.2 3.6a1 1 0 0 1-.27 1.03L7.6 9.87a12 12 0 0 0 5.53 5.53l1.56-1.56a1 1 0 0 1 1.03-.27l3.6 1.2a1 1 0 0 1 .68.95V19a2 2 0 0 1-2 2h-1C9.82 21 3 14.18 3 6V5Z"
                />
              </svg>
            </a>
          ) : null}
          <LinkButton href={RESERVATION_HREF} className="hidden sm:inline-flex">
            예약 문의
          </LinkButton>
          <MobileMenu />
        </div>
      </Container>
    </header>
  );
}
