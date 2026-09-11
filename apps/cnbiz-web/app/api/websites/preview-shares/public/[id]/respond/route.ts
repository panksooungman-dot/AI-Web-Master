import { NextResponse } from "next/server";
import { getWebsitePreviewShare, respondToWebsitePreviewShare } from "@/lib/websites/preview-share";
import { recordAuditEvent } from "@/lib/audit/log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 공개 응답 전용(RBAC 비로그인, "/api/websites/preview-shares/public" 프리픽스) — 의뢰자가
 * app/preview-review/[id]/page.tsx에서 실제 화면을 보고 "승인" 또는 "수정 요청"을 누르면
 * 호출된다. lib/design/storyboard-share.ts의 공개 응답 라우트와 동일한 원칙 — status는
 * 화이트리스트로 제한한다.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const status = isRecord(body) && typeof body.status === "string" ? body.status : "";
  if (status !== "approved" && status !== "revision_requested") {
    return NextResponse.json(
      { success: false, error: 'status는 "approved" 또는 "revision_requested"여야 합니다.' },
      { status: 400 }
    );
  }

  const comment = isRecord(body) && typeof body.comment === "string" ? body.comment.trim() : "";

  const existing = await getWebsitePreviewShare(id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "공유 링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await respondToWebsitePreviewShare(id, { status, comment: comment || null });

  await recordAuditEvent({
    action: "website.preview.share.respond",
    actor: null,
    success: true,
    detail: `Website 실제 화면 공유(${id}) — ${status}${comment ? `: ${comment}` : ""}`,
    metadata: { shareId: id, websiteId: existing.websiteId, status },
  });

  return NextResponse.json({ success: true, share: updated });
}
