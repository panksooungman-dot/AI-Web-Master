import Image from "next/image";
import { Container } from "@cnbiz/layout-primitives";
import type { ReactNode } from "react";
import { ADDRESS, CONTACT, SITE_NAME, SITE_TAGLINE } from "@/lib/site-config";
import { naverMapUrl, telUrl } from "@/lib/links";
import { TodoBadge } from "@/components/ui/TodoBadge";
import { TraditionalPattern } from "@/components/ui/TraditionalPattern";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-4 w-4",
  "aria-hidden": true,
} as const;

function PinIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="m3 11 18-8-8 18-2-8-8-2Z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 4v11" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

function InfoRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary bg-white text-primary">
        {icon}
      </span>
      <div className="min-w-0 pt-1 text-sm leading-relaxed">{children}</div>
    </li>
  );
}

/**
 * 2026-11-08 — 기존엔 기획서 12 FINAL CTA 지침("푸터에서도 동일 CTA 제공")에 따라 홈페이지의
 * FinalCTASection(app/page.tsx)과 완전히 동일한 문구·버튼(네이버 예약하기·예약 문의)을
 * 푸터에도 반복했는데, 홈페이지에서는 바로 그 섹션 바로 아래 같은 문장이 그대로 또 나와
 * 중복/오류처럼 보인다는 매장주 피드백(스크린샷)으로 제거. 예약 CTA는 모든 페이지에서
 * 우측 하단 MobileFloatingCTA(전화·길찾기·예약)가 상시 제공하고 있어 기능 손실은 없다.
 */
export function Footer() {
  const phoneHref = telUrl();

  return (
    <footer className="relative overflow-hidden border-t border-secondary bg-secondary/40">
      <TraditionalPattern className="opacity-[0.12]" />
      <Container className="relative py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Image src="/images/logo.png" alt={SITE_NAME} width={2081} height={700} className="h-10 w-auto" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{SITE_TAGLINE}</p>
          </div>

          <div className="sm:col-start-2 sm:row-span-2 sm:row-start-1 lg:row-span-1">
            <p className="text-sm font-semibold text-foreground">오시는 길</p>
            <ul className="mt-4 flex flex-col gap-3">
              <InfoRow icon={<PinIcon />}>
                <span className="text-muted">{ADDRESS.full}</span>
              </InfoRow>
              <InfoRow icon={<PhoneIcon />}>
                {phoneHref ? (
                  <a href={phoneHref} className="font-medium text-primary hover:underline">
                    {CONTACT.phone}
                  </a>
                ) : (
                  <TodoBadge label="전화번호 확인 필요" />
                )}
              </InfoRow>
              <InfoRow icon={<RouteIcon />}>
                <a href={naverMapUrl()} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                  네이버 지도에서 길찾기
                </a>
              </InfoRow>
              <InfoRow icon={<ClockIcon />}>
                <span className="text-muted">
                  {CONTACT.businessHours} · 매일 영업{CONTACT.closedDays === "연중무휴" ? "" : ` (휴무: ${CONTACT.closedDays})`}
                </span>
              </InfoRow>
            </ul>
          </div>

          {/* ── 3. 모바일 앱 ── */}
          <div className="sm:col-start-1 sm:row-start-2 lg:col-start-3 lg:row-start-1">
            <p className="text-sm font-semibold text-foreground">모바일 앱</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              메뉴와 예약문의를 앱에서 더 편하게
            </p>

            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center lg:flex-col lg:items-start">
              {/* QR — PC 화면에서만 표시 */}
              <div className="hidden shrink-0 md:block">
                <Image
                  src="/images/app-qr.png"
                  alt="사색찬미한정식 앱 다운로드 QR 코드"
                  width={160}
                  height={160}
                  className="h-40 w-40 rounded-lg border border-secondary bg-white p-1"
                />
                <p className="mt-2 text-xs text-muted">
                  휴대폰 카메라로 스캔하세요
                </p>
              </div>

              <div>
                <a
                  href="https://panksooungman-dot.github.io/sasaekchanmi-download/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 active:scale-[0.98]"
                >
                  <DownloadIcon />
                  앱 다운로드
                </a>
                <p className="mt-2 text-xs text-muted">
                  Android 전용 · 약 59MB
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-12 border-t border-secondary pt-6 text-xs text-muted">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
