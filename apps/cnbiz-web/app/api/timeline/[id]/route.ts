import { NextResponse } from "next/server";
import { deleteTimeline, getTimeline } from "@/lib/timeline/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const timeline = await getTimeline(id);

  if (!timeline) {
    return NextResponse.json({ error: "프로젝트 일정을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ timeline });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getTimeline(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "프로젝트 일정을 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteTimeline(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "timeline.delete",
    actor,
    success: true,
    detail: `"${record.input.companyName}" 프로젝트 일정 삭제`,
    metadata: { timelineId: id },
  });

  return NextResponse.json({ success: true });
}
