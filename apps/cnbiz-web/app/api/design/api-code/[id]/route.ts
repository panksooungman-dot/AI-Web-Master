import { NextResponse } from "next/server";
import { getApiCode } from "@/lib/design/api-code";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getApiCode(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `API Code "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    apiCodeId: record.id,
    backendCodeId: record.backendCodeId,
    projectId: record.planId,
    files: record.content.files,
    apiCode: record,
  });
}
