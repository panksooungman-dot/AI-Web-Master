import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { ADDRESS, SITE_TAGLINE } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

function toDataUri(relativePath: string, mime: string) {
  const filePath = join(process.cwd(), "public", relativePath);
  const bytes = readFileSync(filePath);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

/**
 * 카카오톡·페이스북 등 SNS 공유 시 노출되는 OG 이미지. 지어낸 카피 없이 이미 확정된
 * 실제 매장 사진(food/table-spread.jpg, 정갈한 한 상 스토리 사진)·로고·카피(SITE_TAGLINE,
 * ADDRESS.region — 홈 히어로 섹션과 동일 문구)만 사용한다.
 */
export default async function Image() {
  const photo = toDataUri("images/food/table-spread.jpg", "image/jpeg");
  const logo = toDataUri("images/logo.png", "image/png");

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", position: "relative" }}>
        <img
          src={photo}
          alt=""
          width={size.width}
          height={size.height}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(43,33,24,0.1) 0%, rgba(43,33,24,0.55) 60%, rgba(43,33,24,0.92) 100%)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            inset: 0,
            justifyContent: "flex-end",
            padding: "56px 64px",
          }}
        >
          <img src={logo} alt="사색찬미한정식" width={200} height={105} style={{ objectFit: "contain" }} />
          <div style={{ display: "flex", marginTop: 28, fontSize: 44, fontWeight: 700, color: "#fdfaf5" }}>
            {SITE_TAGLINE}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 26, color: "#efe3d1" }}>
            {ADDRESS.region} · 한정식 · 솥밥
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
