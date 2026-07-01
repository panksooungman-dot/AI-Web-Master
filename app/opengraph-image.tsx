import { ImageResponse } from "next/og";

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
          background: "#1F2937",
        }}
      >
        <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: "#ffffff" }}>
          CN<span style={{ color: "#4F9DE0" }}>BIZ</span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 32, color: "#cbd5e1" }}>
          디지털 혁신으로 비즈니스의 미래를 열다
        </div>
      </div>
    ),
    { ...size }
  );
}
