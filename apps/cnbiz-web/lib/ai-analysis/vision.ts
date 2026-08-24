import { resolveAbsoluteUrl } from "./siteUrl";

/**
 * 업로드된 이미지(로고·서비스 사진 등)를 실제로 "보고" 요약하는 비전 분석. 기존
 * lib/ai/bridge.ts의 chatViaCli()(packages/cli 서브프로세스 경유, 텍스트 전용)는 이미지
 * content block을 지원하지 않고, 그걸 확장하려면 CLI 인자 프로토콜까지 손대야 해서 이번
 * 범위에 비해 과하다고 판단해 별도 경로로 뺐다 — packages/cli의 providers/anthropic.ts와
 * 동일하게 raw fetch로 Anthropic Messages API를 직접 호출한다(이 모노레포에
 * @anthropic-ai/sdk가 어디에도 설치돼 있지 않고, 기존 provider들도 전부 raw fetch 컨벤션이라
 * 이 한 기능을 위해 새 의존성을 추가하지 않는다). 모델도 packages/cli/src/providers/
 * anthropic.ts의 DEFAULT_MODEL과 동일한 claude-sonnet-5로 맞춘다.
 *
 * ANTHROPIC_API_KEY가 없거나 어떤 단계에서든 실패하면 항상 null을 반환한다 — Inquiry 접수
 * 자체를 절대 막지 않는다(generateAnalysis()의 다른 결정론적 폴백들과 동일한 원칙).
 */

const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-5";
const MAX_IMAGES = 2;
const FETCH_TIMEOUT_MS = 15000;

const VISION_MEDIA_TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

function extensionOf(url: string): string {
  const withoutQuery = url.split("?")[0];
  const dot = withoutQuery.lastIndexOf(".");
  return dot === -1 ? "" : withoutQuery.slice(dot).toLowerCase();
}

async function fetchAsBase64(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return buffer.toString("base64");
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface ImageBlock {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
}

/**
 * uploadedFiles 중 비전 API가 지원하는 확장자(png/jpg/jpeg/gif/webp — svg는 Anthropic이
 * 이미지 블록으로 지원하지 않아 제외)만 골라 최대 MAX_IMAGES개까지 base64로 인코딩한다.
 */
async function collectImageBlocks(uploadedFiles: string[]): Promise<ImageBlock[]> {
  const candidates = uploadedFiles
    .filter((url) => extensionOf(url) in VISION_MEDIA_TYPE_BY_EXT)
    .slice(0, MAX_IMAGES);

  const blocks: ImageBlock[] = [];
  for (const url of candidates) {
    const absoluteUrl = resolveAbsoluteUrl(url);
    const data = await fetchAsBase64(absoluteUrl, FETCH_TIMEOUT_MS);
    if (!data) continue;
    blocks.push({
      type: "image",
      source: { type: "base64", media_type: VISION_MEDIA_TYPE_BY_EXT[extensionOf(url)], data },
    });
  }
  return blocks;
}

export async function describeUploadedImages(uploadedFiles?: string[]): Promise<string | null> {
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey || !uploadedFiles || uploadedFiles.length === 0) return null;

  const imageBlocks = await collectImageBlocks(uploadedFiles);
  if (imageBlocks.length === 0) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [
              ...imageBlocks,
              {
                type: "text",
                text:
                  "위 이미지는 홈페이지 제작 의뢰 고객이 첨부한 로고 또는 서비스 사진입니다. " +
                  "브랜드 컬러, 전반적인 톤(예: 모던/전통적/화려함/차분함), 사진 스타일을 " +
                  "2~3문장의 한국어로 간단히 설명해주세요. 실제 사업 판단이나 추천은 하지 마세요.",
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();
    return text || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
