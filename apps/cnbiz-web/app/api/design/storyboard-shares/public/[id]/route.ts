import { NextResponse } from "next/server";
import { getStoryboardShare } from "@/lib/design/storyboard-share";
import { getStoryboard } from "@/lib/design/storyboard";
import { getDesignPlan } from "@/lib/design/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 공개 조회 전용(RBAC 비로그인, lib/auth/rbac.ts의 UNGATED_API_PREFIXES
 * "/api/design/storyboard-shares/public" 참고) — 의뢰자가 로그인 없이 여는
 * app/design-review/[id]/page.tsx가 사용한다. app/api/launch-requests/public/[id]/route.ts와
 * 동일한 원칙 — 민감정보(내부 관리자 이메일 등)는 응답에 포함하지 않는다.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const share = await getStoryboardShare(id);

  if (!share) {
    return NextResponse.json({ error: "공유 링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const storyboard = await getStoryboard(share.storyboardId);
  if (!storyboard) {
    return NextResponse.json({ error: "Storyboard를 찾을 수 없습니다." }, { status: 404 });
  }

  const plan = await getDesignPlan(storyboard.planId);

  return NextResponse.json({
    share: {
      id: share.id,
      status: share.status,
      comment: share.comment,
      createdAt: share.createdAt,
      respondedAt: share.respondedAt,
    },
    projectName: plan?.input.projectName ?? "프로젝트",
    storyboard: {
      screenFlow: storyboard.content.screenFlow,
      userJourneys: storyboard.content.userJourneys,
      navigationFlow: storyboard.content.navigationFlow,
      pageSequence: storyboard.content.pageSequence,
      screenDescriptions: storyboard.content.screenDescriptions,
    },
  });
}
