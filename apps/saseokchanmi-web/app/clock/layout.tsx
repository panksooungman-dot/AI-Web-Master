import type { Metadata } from "next";

/** 매장 출퇴근 기기 화면. 검색엔진에 노출하지 않고, 앱처럼 설치할 수 있게 매니페스트를 연결한다. */
export const metadata: Metadata = {
  title: "출퇴근",
  robots: { index: false, follow: false, nocache: true },
  manifest: "/clock.webmanifest",
  icons: { icon: "/images/clock-192.png", apple: "/images/clock-192.png" },
};

export default function ClockLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">{children}</div>;
}
