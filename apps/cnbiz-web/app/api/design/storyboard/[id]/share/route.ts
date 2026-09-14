import { NextResponse } from "next/server";
import { getStoryboard } from "@/lib/design/storyboard";
import { getOrCreateStoryboardShare, getStoryboardShareByStoryboardId } from "@/lib/design/storyboard-share";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * "Website Build 연결(승인 후 실제 화면 생성)"(2026-09-14) — 관리자 Storyboard 화면이 "의뢰자에게
 * 공유" 버튼을 다시 누르지 않아도 승인 상태를 확인할 수 있어야, 승인되자마자 "다음 단계 시작"
 * CTA를 보여줄 수 있다. 공유 링크를 아직 만들지 않은 Storyboard까지 생성해버리면 안 되므로
 * `getOrCreateStoryboardShare()`가 아닌 조회 전용 `getStoryboardShareByStoryboardId()`를 쓴다 —
 * 아직 공유된 적 없으면 `share: null`을 반환(오류 아님).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const share = await getStoryboardShareByStoryboardId(id);
  return NextResponse.json({ share: share ?? null });
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
