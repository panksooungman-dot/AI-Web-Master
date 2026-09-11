import { NextResponse } from "next/server";
import { getWebsite } from "@/lib/websites/registry";
import { getOrCreateWebsitePreviewShare } from "@/lib/websites/preview-share";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 관리자가 "의뢰자에게 공유"를 눌렀을 때 호출된다(로그인 필요, `/api/websites/**`는 RBAC
 * 기본값으로 developer 게이팅됨). Preview 배포가 아직 없으면(코드 생성이 아직 안 됐거나 이미
 * 운영으로 확정된 경우) 공유할 실제 화면이 없다는 뜻이라 400으로 거부한다.
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const website = await getWebsite(id);

  if (!website) {
    return NextResponse.json({ success: false, error: "Website를 찾을 수 없습니다." }, { status: 404 });
  }

  if (website.deploymentStatus !== "PreviewReady" || !website.deployment) {
    return NextResponse.json(
      { success: false, error: "Preview 배포가 준비된 상태에서만 공유할 수 있습니다." },
      { status: 400 }
    );
  }

  const share = await getOrCreateWebsitePreviewShare(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "website.preview.share.create",
    actor,
    success: true,
    detail: `Website "${id}" 실제 화면 공유 링크 생성`,
    metadata: { websiteId: id, shareId: share.id },
  });

  return NextResponse.json({ success: true, share });
}
