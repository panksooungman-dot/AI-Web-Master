import { NextResponse } from "next/server";
import { deleteSyncRecord, getSyncRecord } from "@/lib/design/design-sync";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/sync/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getSyncRecord(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Sync "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    syncId: record.id,
    projectId: record.planId,
    reviewId: record.reviewId,
    direction: record.direction,
    status: record.status,
    patch: record.patch,
    conflicts: record.conflicts,
    version: record.version,
    sync: record,
  });
}

/** History 목록의 삭제 버튼. app/api/design/requirements/[id]/route.ts의 DELETE와 동일한 패턴. */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getSyncRecord(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Sync "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  await deleteSyncRecord(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.sync.delete",
    actor,
    success: true,
    detail: `Sync "${id}" 삭제`,
    metadata: { syncId: id, reviewId: record.reviewId },
  });

  return NextResponse.json({ success: true });
}
