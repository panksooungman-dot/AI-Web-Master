import { NextResponse } from "next/server";
import { deleteStoryboard, getStoryboard } from "@/lib/design/storyboard";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** docs/03_DESIGN 스펙의 `GET /api/design/storyboard/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getStoryboard(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Storyboard "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    storyboardId: record.id,
    projectId: record.planId,
    screens: record.content.screenDescriptions,
    flow: record.content.screenFlow,
    storyboard: record,
  });
}

/** History 목록의 삭제 버튼. app/api/design/requirements/[id]/route.ts의 DELETE와 동일한 패턴. */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getStoryboard(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Storyboard "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  await deleteStoryboard(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.storyboard.delete",
    actor,
    success: true,
    detail: `Storyboard "${id}" 삭제`,
    metadata: { storyboardId: id, planId: record.planId },
  });

  return NextResponse.json({ success: true });
}
