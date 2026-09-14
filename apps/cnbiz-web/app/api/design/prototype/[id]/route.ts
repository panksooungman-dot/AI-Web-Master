import { NextResponse } from "next/server";
import { deletePrototype, getPrototype } from "@/lib/design/prototype";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** docs/03_DESIGN 스펙의 `GET /api/design/prototype/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getPrototype(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Prototype "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    prototypeId: record.id,
    projectId: record.planId,
    screens: record.content.screens,
    interactions: record.content.interactionMap,
    transitions: record.content.screenTransitions,
    journey: record.content.userJourneys,
    preview: record.content.preview,
    prototype: record,
  });
}

/** History 목록의 삭제 버튼. app/api/design/requirements/[id]/route.ts의 DELETE와 동일한 패턴. */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getPrototype(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Prototype "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  await deletePrototype(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.prototype.delete",
    actor,
    success: true,
    detail: `Prototype "${id}" 삭제`,
    metadata: { prototypeId: id, wireframeId: record.wireframeId },
  });

  return NextResponse.json({ success: true });
}
