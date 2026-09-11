import { NextResponse } from "next/server";
import { deleteLaunchRequest, getLaunchRequest } from "@/lib/launchRequests/registry";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** 관리자 전용(developer 로그인 필요, RBAC 기본 게이팅) — /developer/launch-requests/[id] 상세 화면. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const launchRequest = await getLaunchRequest(id);

  if (!launchRequest) {
    return NextResponse.json({ error: "정보 요청서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ launchRequest });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getLaunchRequest(id);

  if (!record) {
    return NextResponse.json({ success: false, error: "정보 요청서를 찾을 수 없습니다." }, { status: 404 });
  }

  await deleteLaunchRequest(id);

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "launchRequest.delete",
    actor,
    success: true,
    detail: `"${record.companyName}" 정보 요청서 삭제`,
    metadata: { launchRequestId: id },
  });

  return NextResponse.json({ success: true });
}
