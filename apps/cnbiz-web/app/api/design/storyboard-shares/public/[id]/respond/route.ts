import { NextResponse } from "next/server";
import { getStoryboardShare, respondToStoryboardShare } from "@/lib/design/storyboard-share";
import { recordAuditEvent } from "@/lib/audit/log";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * 공개 응답 전용(RBAC 비로그인, "/api/design/storyboard-shares/public" 프리픽스) — 의뢰자가
 * app/design-review/[id]/page.tsx에서 "승인" 또는 "수정 요청"을 누르면 호출된다. 요청 본문의
 * `status`는 "approved" | "revision_requested"만 허용(공개 엔드포인트라 임의 상태 전이를
 * 받지 않도록 화이트리스트로 제한 — Phase 6 Approval Engine과 달리 로그인한 관리자가 아니므로
 * 더 엄격하게 검증한다).
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

  const existing = await getStoryboardShare(id);
  if (!existing) {
    return NextResponse.json({ success: false, error: "공유 링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await respondToStoryboardShare(id, { status, comment: comment || null });

  await recordAuditEvent({
    action: "design.storyboard.share.respond",
    actor: null,
    success: true,
    detail: `Storyboard 공유(${id}) — ${status}${comment ? `: ${comment}` : ""}`,
    metadata: { shareId: id, storyboardId: existing.storyboardId, status },
  });

  return NextResponse.json({ success: true, share: updated });
}
