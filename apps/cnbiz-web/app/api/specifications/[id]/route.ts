import { NextResponse } from "next/server";
import { deleteSpecification, getSpecification } from "@/lib/specifications/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const specification = await getSpecification(id);

  if (!specification) {
    return NextResponse.json({ error: "기능 명세서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ specification });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getSpecification(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "기능 명세서를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteSpecification(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "specification.delete",
    actor,
    success: true,
    detail: `"${record.input.companyName}" 기능 명세서 삭제`,
    metadata: { specificationId: id },
  });

  return NextResponse.json({ success: true });
}
