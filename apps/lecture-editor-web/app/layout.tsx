import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "강의영상 자동편집",
  description: "촬영 원본을 올리면 자동으로 컷편집 + 줌인 편집된 영상을 받는 내부 도구",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        {children}
      </body>
    </html>
  );
}
