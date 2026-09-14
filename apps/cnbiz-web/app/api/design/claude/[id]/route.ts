import { NextResponse } from "next/server";
import { deleteClaudeDesign, getClaudeDesign } from "@/lib/design/claude-design";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/claude/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getClaudeDesign(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Claude Design "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    claudeDesignId: record.id,
    projectId: record.planId,
    designPrompt: record.content.designPrompt,
    uiPrompt: record.content.uiPrompt,
    componentPrompt: record.content.componentPrompt,
    themePrompt: record.content.themePrompt,
    layoutPrompt: record.content.layoutPrompt,
    claudeDesign: record,
  });
}

/** History 목록의 삭제 버튼. app/api/design/requirements/[id]/route.ts의 DELETE와 동일한 패턴. */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getClaudeDesign(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Claude Design "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  await deleteClaudeDesign(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.claude.delete",
    actor,
    success: true,
    detail: `Claude Design "${id}" 삭제`,
    metadata: { claudeDesignId: id, prototypeId: record.prototypeId },
  });

  return NextResponse.json({ success: true });
}
