import { NextResponse } from "next/server";
import { extractContactInfoFromAttachments } from "@/lib/inquiries/extractContact";

/**
 * Admin-only(RBAC 기본값 — UNGATED_API_PREFIXES/EXACT_ROUTES에 없는 /api/** 는 "developer"
 * 게이팅). app/developer/inquiries/new/page.tsx의 "파일에서 자동 채우기" 버튼 전용 —
 * 첨부파일(이미지·텍스트/코드) 내용에서 회사명·담당자명·이메일·문의 제목을 뽑아 미리
 * 채워준다. 아무것도 찾지 못해도 항상 200 + simulated:true로 응답해, 관리자가 직접
 * 입력하는 기존 흐름을 절대 막지 않는다.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const uploadedFiles = Array.isArray(record.uploadedFiles)
    ? record.uploadedFiles.filter((item): item is string => typeof item === "string")
    : undefined;
  const codeSnippets = Array.isArray(record.codeSnippets)
    ? record.codeSnippets
        .filter((item): item is { filename: unknown; content: unknown } => typeof item === "object" && item !== null)
        .map((item) => ({
          filename: String((item as Record<string, unknown>).filename ?? ""),
          content: String((item as Record<string, unknown>).content ?? ""),
        }))
        .filter((item) => item.filename && item.content)
    : undefined;

  const result = await extractContactInfoFromAttachments({ uploadedFiles, codeSnippets });
  return NextResponse.json({ success: true, ...result });
}
