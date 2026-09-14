import { NextResponse } from "next/server";
import { deleteDesignPlan, getDesignPlan } from "@/lib/design/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Design Plan(Requirements) 단건 삭제. app/api/proposals/[id]/route.ts와 동일한 패턴 —
 * 이후 단계(Storyboard/Wireframe/...)가 이 Plan을 참조하고 있어도 그 레코드 자체는 삭제하지
 * 않는다(연쇄 삭제는 이번 범위 밖 — 다른 Phase도 각자 독립적으로 삭제 가능한 자기 레지스트리를
 * 갖고 있다).
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getDesignPlan(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "Design Plan을 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteDesignPlan(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.plan.delete",
    actor,
    success: true,
    detail: `"${record.input.projectName}" Design Plan 삭제`,
    metadata: { designPlanId: id },
  });

  return NextResponse.json({ success: true });
}
