import { NextResponse } from "next/server";
import { getSyncRecord } from "@/lib/design/design-sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/sync/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getSyncRecord(id);

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
