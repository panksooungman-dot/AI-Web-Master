import { MAX_SIG_LENGTH } from "../format";

/**
 * 서명·도장 이미지를 "배경이 투명한 PNG"로 만드는 브라우저 전용 도우미.
 * 서버는 PNG data URL만 받는다(`safeImg`). 여기서 크기를 줄여 용량 제한(MAX_SIG_LENGTH) 안에 맞춘다.
 */

const MAX_W = 360;
const MAX_H = 160;

/** 투명하지 않은 픽셀의 경계 상자. 아무것도 없으면 null. */
function opaqueBounds(ctx: CanvasRenderingContext2D, w: number, h: number): { x: number; y: number; w: number; h: number } | null {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const pad = 4;
  const x = Math.max(0, minX - pad);
  const y = Math.max(0, minY - pad);
  return { x, y, w: Math.min(w, maxX + pad + 1) - x, h: Math.min(h, maxY + pad + 1) - y };
}

/**
 * 캔버스에 그려진 내용(투명 배경)을 잘라 내고 줄여서 PNG data URL로 돌려준다.
 * 아무것도 그려져 있지 않으면 빈 문자열. 용량 제한을 넘으면 더 줄여서 다시 만든다.
 */
export function trimAndExport(source: HTMLCanvasElement): string {
  const ctx = source.getContext("2d");
  if (!ctx) return "";
  const b = opaqueBounds(ctx, source.width, source.height);
  if (!b) return "";
  let scale = Math.min(1, MAX_W / b.w, MAX_H / b.h);
  for (let i = 0; i < 6; i++) {
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(b.w * scale));
    out.height = Math.max(1, Math.round(b.h * scale));
    const octx = out.getContext("2d");
    if (!octx) return "";
    octx.imageSmoothingQuality = "high";
    octx.drawImage(source, b.x, b.y, b.w, b.h, 0, 0, out.width, out.height);
    const url = out.toDataURL("image/png");
    if (url.length <= MAX_SIG_LENGTH) return url;
    scale *= 0.8;
  }
  return "";
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    img.src = url;
  });
}

/**
 * 종이에 서명·도장을 찍어 사진으로 찍은 파일을 투명 배경 PNG로 바꾼다.
 * 흰 종이는 투명하게, 잉크는 그대로 남긴다(밝기가 아니라 "흰색에서 얼마나 먼가"로 투명도를 정한다).
 */
export async function fileToSignaturePng(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일(사진)을 선택해 주세요.");
  if (file.size > 15 * 1024 * 1024) throw new Error("파일이 너무 큽니다. 15MB 이하의 사진을 선택해 주세요.");
  const img = await loadImage(file);
  const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("이 브라우저에서는 이미지를 처리할 수 없습니다.");
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h);
  const d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const dist = 255 - Math.min(d[i], d[i + 1], d[i + 2]);
    const a = Math.max(0, Math.min(1, (dist - 28) / 70));
    d[i + 3] = Math.round(a * (d[i + 3] / 255) * 255);
  }
  ctx.putImageData(px, 0, 0);
  const url = trimAndExport(canvas);
  if (!url) throw new Error("사진에서 서명이나 도장을 찾지 못했습니다. 흰 종이에 또렷하게 찍은 사진을 사용해 주세요.");
  return url;
}
