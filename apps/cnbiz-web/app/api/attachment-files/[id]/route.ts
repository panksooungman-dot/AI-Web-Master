import { NextResponse } from "next/server";
import { readFsAttachment } from "@/lib/storage";

/**
 * 로컬 개발/테스트 전용 서빙 라우트 — 프로덕션은 Supabase Storage의 공개 URL을 직접 반환하므로
 * (lib/storage/supabaseStore.ts) 이 라우트를 거치지 않는다. Ungated인 이유는
 * lib/auth/rbac.ts의 UNGATED_API_PREFIXES 주석 참고.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const attachment = readFsAttachment(id);

  if (!attachment) {
    return NextResponse.json({ success: false, error: "첨부파일을 찾을 수 없습니다." }, { status: 404 });
  }

  return new NextResponse(new Blob([new Uint8Array(attachment.buffer)]), {
    headers: { "Content-Type": attachment.contentType, "Cache-Control": "private, max-age=3600" },
  });
}
