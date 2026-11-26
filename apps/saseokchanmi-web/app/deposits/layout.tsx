import type { Metadata } from "next";

/** 포스기 입금 확인 화면. 검색엔진에 노출하지 않는다. */
export const metadata: Metadata = {
  title: "입금 확인",
  robots: { index: false, follow: false, nocache: true },
};

export default function DepositsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">{children}</div>;
}
