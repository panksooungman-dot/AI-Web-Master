import Link from "next/link";
import { Container } from "@cnbiz/layout-primitives";
import { LinkButton } from "@cnbiz/ui";
import { ADDRESS, CONTACT, NAV_ITEMS, RESERVATION_HREF, SITE_NAME } from "@/lib/site-config";
import { naverMapUrl, telUrl } from "@/lib/links";
import { TodoBadge } from "@/components/ui/TodoBadge";

/** 기획서 12 FINAL CTA: "푸터에서도 동일 CTA 제공". */
export function Footer() {
  const phoneHref = telUrl();

  return (
    <footer className="border-t border-secondary bg-secondary/40">
      <Container className="py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-primary">{SITE_NAME}</p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              오늘, 좋은 사람과 함께 따뜻한 한 끼 어떠세요?
            </p>
            <LinkButton href={RESERVATION_HREF} className="mt-5">
              예약 문의
            </LinkButton>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">오시는 길</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{ADDRESS.full}</p>
            <div className="mt-2 flex flex-col gap-1 text-sm">
              {phoneHref ? (
                <a href={phoneHref} className="text-primary hover:underline">
                  전화 문의
                </a>
              ) : (
                <TodoBadge label="전화번호 확인 필요" />
              )}
              <a href={naverMapUrl()} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                네이버 지도에서 길찾기
              </a>
              {!CONTACT.businessHours && <TodoBadge label="영업시간 확인 필요" />}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">메뉴</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted hover:text-primary">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-12 border-t border-secondary pt-6 text-xs text-muted">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
