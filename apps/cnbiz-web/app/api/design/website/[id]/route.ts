import { NextResponse } from "next/server";
import { deleteWebsiteBuild, getWebsiteBuildRecord } from "@/lib/design/website-build";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/website/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getWebsiteBuildRecord(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Build "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    buildId: record.id,
    projectId: record.planId,
    reviewId: record.reviewId,
    websiteId: record.websiteId,
    siteType: record.siteType,
    status: record.status,
    simulatedContent: record.simulatedContent,
    version: record.version,
    build: record,
  });
}

/** History 목록의 삭제 버튼. app/api/design/requirements/[id]/route.ts의 DELETE와 동일한 패턴. */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getWebsiteBuildRecord(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Build "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  await deleteWebsiteBuild(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.website.delete",
    actor,
    success: true,
    detail: `Website Build "${id}" 삭제`,
    metadata: { buildId: id, reviewId: record.reviewId },
  });

  return NextResponse.json({ success: true });
}
