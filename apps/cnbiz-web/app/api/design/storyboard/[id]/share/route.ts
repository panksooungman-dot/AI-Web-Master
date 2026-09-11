import { NextResponse } from "next/server";
import { getStoryboard } from "@/lib/design/storyboard";
import { getOrCreateStoryboardShare } from "@/lib/design/storyboard-share";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 관리자가 "의뢰자에게 공유" 버튼을 눌렀을 때 호출된다(로그인 필요, `/api/design/**`는
 * RBAC 기본값으로 developer 게이팅됨 — 별도 예외 불필요). 응답의 shareId로 만들어지는
 * `/design-review/{shareId}` 링크는 로그인 없이 열린다(공개 조회는
 * `/api/design/storyboard-shares/public/[id]`가 담당, RBAC 예외 있음).
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const storyboard = await getStoryboard(id);

  if (!storyboard) {
    return NextResponse.json({ success: false, error: "Storyboard를 찾을 수 없습니다." }, { status: 404 });
  }

  const share = await getOrCreateStoryboardShare(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.storyboard.share.create",
    actor,
    success: true,
    detail: `Storyboard "${id}" 공유 링크 생성`,
    metadata: { storyboardId: id, shareId: share.id },
  });

  return NextResponse.json({ success: true, share });
}
