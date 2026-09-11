import { NextResponse } from "next/server";
import { getWebsitePreviewShare } from "@/lib/websites/preview-share";
import { getWebsite } from "@/lib/websites/registry";
import { getWebsiteOrderByWebsiteId } from "@/lib/websiteOrders/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 공개 조회 전용(RBAC 비로그인, lib/auth/rbac.ts의 UNGATED_API_PREFIXES
 * "/api/websites/preview-shares/public" 참고) — 의뢰자가 로그인 없이 여는
 * app/preview-review/[id]/page.tsx가 사용한다. 응답에는 실제 배포 URL과 프로젝트명만 포함하고
 * 저장소·Vercel 프로젝트 ID 등 내부 인프라 정보는 노출하지 않는다.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const share = await getWebsitePreviewShare(id);

  if (!share) {
    return NextResponse.json({ error: "공유 링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const website = await getWebsite(share.websiteId);
  if (!website || !website.deployment) {
    return NextResponse.json({ error: "미리보기 화면을 찾을 수 없습니다." }, { status: 404 });
  }

  const order = await getWebsiteOrderByWebsiteId(share.websiteId);

  return NextResponse.json({
    share: {
      id: share.id,
      status: share.status,
      comment: share.comment,
      createdAt: share.createdAt,
      respondedAt: share.respondedAt,
    },
    projectName: order?.name ?? website.name,
    previewUrl: website.deployment.url,
  });
}
