import { NextResponse } from "next/server";
import fs from "node:fs";
import { resolveSafeSourcePath } from "../safe-source-path";

/**
 * Visual Editor "AI로 수정 요청" — 버튼 추가·애니메이션 효과처럼 색상·여백 편집으로는 안
 * 되는 구조적 변경을 자연어로 요청하면, Claude가 파일 전체를 다시 써서 제안한다. 파일에는
 * 바로 쓰지 않고 제안만 반환한다 — 실제 저장은 사용자가 미리보기를 확인한 뒤
 * save-file 핸들러를 별도로 호출해야 이뤄진다. 색상·여백은 값 하나만 바뀌어 실수해도
 * 되돌리기 쉽지만, 이건 AI가 파일 전체를 재작성하는 것이라 문법 오류·의도치 않은 변경
 * 위험이 커서 자동 저장하지 않는다.
 *
 * 이 모노레포의 다른 Anthropic 호출(lib/ai-analysis/vision.ts,
 * packages/cli/src/providers/anthropic.ts)과 동일하게 raw fetch로 Messages API를 직접
 * 호출한다(SDK 미설치, 새 의존성 추가 없음). 모델은 코드를 다시 쓰는 작업이라 정확성이
 * 중요해 claude-opus-5를 쓴다(다른 호출들의 claude-sonnet-5보다 상위 모델).
 */

const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-opus-5";
const MAX_TOKENS = 8192;
const FETCH_TIMEOUT_MS = 60000;

const SYSTEM_PROMPT =
  "당신은 Next.js(App Router) + React + TypeScript + Tailwind CSS 프로젝트의 코드를 " +
  "수정하는 어시스턴트입니다. 사용자가 요청한 변경사항만 반영하고, 나머지 코드·포맷· " +
  "들여쓰기는 최대한 그대로 유지하세요. Tailwind CSS 유틸리티 클래스만 사용하고 인라인 " +
  "style은 꼭 필요한 경우가 아니면 추가하지 마세요. 응답은 수정된 파일의 전체 내용만 " +
  "반환하세요 — 설명, 주석, 마크다운 코드 펜스(```) 없이 파일 내용 그대로만 출력합니다.";

interface AiEditRequest {
  file?: string;
  instruction?: string;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-z]*\n([\s\S]*?)\n```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function aiEditHandler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, reason: "disabled" }, { status: 403 });
  }

  let body: AiEditRequest;
  try {
    body = (await request.json()) as AiEditRequest;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const { file, instruction } = body;
  if (typeof file !== "string" || !file || typeof instruction !== "string" || !instruction.trim()) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const absolutePath = resolveSafeSourcePath(file);
  if (!absolutePath) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json({ success: false, reason: "not-configured" }, { status: 400 });
  }

  const originalContent = fs.readFileSync(absolutePath, "utf-8");

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
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content:
              `다음은 현재 파일(${file})의 전체 내용입니다:\n\n${originalContent}\n\n` +
              `요청사항: ${instruction}\n\n위 요청을 반영한 파일 전체 내용을 그대로 반환해주세요.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ success: false, reason: "provider-error" }, { status: 502 });
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = data.content?.find((block) => block.type === "text")?.text;

    if (!text || !text.trim()) {
      return NextResponse.json({ success: false, reason: "empty-response" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      originalContent,
      proposedContent: stripCodeFence(text),
    });
  } catch {
    return NextResponse.json({ success: false, reason: "network-error" }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}
