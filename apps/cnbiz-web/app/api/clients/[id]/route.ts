import { NextResponse } from "next/server";
import { deleteClient, getClient, updateClient } from "@/lib/clients/registry";
import { parseClientUpdateInput, validateClientUpdateInput } from "@/lib/clients/validate";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getClient(id);

  if (!record) {
    return NextResponse.json({ error: "고객사를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ client: record });
}

/** 연락처 정정 등 관리자가 직접 고칠 필요가 실사용에서 확인되어 추가 — 부분 수정(PATCH)만 지원. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const input = parseClientUpdateInput(body);
  const errors = validateClientUpdateInput(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ success: false, error: "입력값을 확인하세요.", errors }, { status: 400 });
  }

  const before = await getClient(id);
  if (!before) {
    return NextResponse.json({ success: false, error: "고객사를 찾을 수 없습니다." }, { status: 404 });
  }

  const record = await updateClient(id, input);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "client.update",
    actor,
    success: true,
    detail: `"${before.companyName || before.contactName}" 정보 수정`,
    metadata: { clientId: id, fields: Object.keys(input) },
  });

  return NextResponse.json({ success: true, client: record });
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
