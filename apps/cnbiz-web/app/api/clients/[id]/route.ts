import { NextResponse } from "next/server";
import { deleteClient, getClient } from "@/lib/clients/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET/DELETE만 제공한다 — Client는 Inquiry/WebsiteOrder 같은 상태 전이(status)가 없는 순수 신원
 * 레코드라 관리자가 직접 편집할 필드가 없다(연락처 정정 등은 이번 범위 밖).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getClient(id);

  if (!record) {
    return NextResponse.json({ error: "고객사를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ client: record });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getClient(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "고객사를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteClient(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "client.delete",
    actor,
    success: true,
    detail: `"${record.companyName || record.contactName}" 삭제`,
    metadata: { clientId: id },
  });

  return NextResponse.json({ success: true });
}
