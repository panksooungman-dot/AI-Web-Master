import { ImageResponse } from "next/og";
import { content } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "{{colorSecondary}}",
          padding: "80px",
          textAlign: "center"
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#ffffff" }}>{siteConfig.projectName}</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "{{colorAccent}}" }}>
          {content.home.headline}
        </div>
      </div>
    ),
    { ...size }
  );
}
