import {
  ANTHROPIC_VERSION,
  VISION_MODEL,
  VISION_MEDIA_TYPE_BY_EXT,
  extensionOf,
  collectImageBlocks,
} from "@/lib/ai-analysis/vision";

/**
 * "파일 안에 정보가 있을텐데 기재 않하고 파일로 대체" (2026-09-12) — 관리자가 첨부파일에
 * 이미 담겨 있는 회사명·담당자명·이메일을 다시 타이핑하지 않도록, 첨부파일 내용에서 이
 * 정보를 실제로 읽어 미리 채워준다. lib/ai-analysis/vision.ts와 완전히 동일한 원칙
 * (ANTHROPIC_API_KEY 없거나 어떤 단계든 실패하면 항상 빈 결과 — Inquiry 등록 자체를 막지
 * 않고 관리자가 직접 입력하는 기존 흐름으로 조용히 폴백) — 새 Provider 추상화나 CLI 변경
 * 없이 이미지 인코딩 로직을 그대로 재사용한다.
 *
 * 다루는 입력: 이미지(로고·명함 사진 등)와 텍스트로 읽히는 첨부파일 전부(codeSnippets —
 * .txt/.md/.js 같은 순수 텍스트/코드 파일뿐 아니라, app/api/inquiries/upload/route.ts가
 * lib/uploads/officeText.ts로 텍스트를 뽑아낸 DOCX/PPTX/XLSX/PDF도 동일한 codeSnippets
 * 형태로 들어온다 — 이 모듈은 출처를 구분하지 않는다). HWP(.hwp/.hwpx)는 검증된 오픈소스
 * 파서가 사실상 없어(후보 hwp.js는 0.0.3 초기 단계) 여전히 범위 밖이다(2026-09-12 확인).
 */

export interface ExtractedContactInfo {
  companyName?: string;
  contactName?: string;
  email?: string;
  title?: string;
}

const MAX_TEXT_SOURCES = 5;
const MAX_CHARS_PER_SOURCE = 4000;
const MAX_IMAGES = 2;
const FETCH_TIMEOUT_MS = 15000;

function cleanValue(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : undefined;
}

/** 모델이 ```json ... ``` 코드 펜스로 감싸 응답하는 경우를 대비해 순수 JSON 부분만 뽑아낸다. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const withoutFence = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(withoutFence);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export interface ExtractContactResult {
  extracted: ExtractedContactInfo;
  /** true면 실제로 AI를 호출하지 못했다는 뜻(키 미설정·첨부 없음·API 실패 등) — 관리자가
   *  직접 입력해야 한다는 신호로 쓴다. */
  simulated: boolean;
}

export async function extractContactInfoFromAttachments(input: {
  uploadedFiles?: string[];
  codeSnippets?: { filename: string; content: string }[];
}): Promise<ExtractContactResult> {
  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  const textSources = (input.codeSnippets ?? []).slice(0, MAX_TEXT_SOURCES);
  const imageUrls = (input.uploadedFiles ?? []).filter((url) => extensionOf(url) in VISION_MEDIA_TYPE_BY_EXT);

  if (!apiKey || (textSources.length === 0 && imageUrls.length === 0)) {
    return { extracted: {}, simulated: true };
  }

  const imageBlocks = await collectImageBlocks(imageUrls, MAX_IMAGES);
  const textBlock = textSources
    .map((source) => `--- ${source.filename} ---\n${source.content.slice(0, MAX_CHARS_PER_SOURCE)}`)
    .join("\n\n");

  if (imageBlocks.length === 0 && !textBlock) {
    return { extracted: {}, simulated: true };
  }

  const promptText =
    "다음은 홈페이지 제작 의뢰 고객이 첨부한 파일(제안서·견적서·이미지 등)입니다. " +
    "이 안에서 실제로 찾을 수 있는 정보만 사용해 아래 JSON 형식으로 답하세요. " +
    "찾을 수 없는 항목은 반드시 빈 문자열로 두고, 절대 추측하거나 지어내지 마세요.\n\n" +
    (textBlock ? `[문서 내용]\n${textBlock}\n\n` : "") +
    'JSON 형식: {"companyName": "", "contactName": "", "email": "", "title": ""}\n' +
    "- companyName: 회사명/업체명\n" +
    "- contactName: 담당자 이름\n" +
    "- email: 이메일 주소\n" +
    '- title: 문의 제목으로 쓸 만한 한 줄 요약(예: "OO 홈페이지 제작 문의")\n' +
    "다른 설명 없이 JSON 객체만 출력하세요.";

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
        model: VISION_MODEL,
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: [...imageBlocks, { type: "text", text: promptText }],
          },
        ],
      }),
    });

    if (!res.ok) return { extracted: {}, simulated: true };

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text?.trim();
    if (!text) return { extracted: {}, simulated: true };

    const parsed = parseJsonObject(text);
    if (!parsed) return { extracted: {}, simulated: true };

    return {
      extracted: {
        companyName: cleanValue(parsed.companyName),
        contactName: cleanValue(parsed.contactName),
        email: cleanValue(parsed.email),
        title: cleanValue(parsed.title),
      },
      simulated: false,
    };
  } catch {
    return { extracted: {}, simulated: true };
  } finally {
    clearTimeout(timer);
  }
}
