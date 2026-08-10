import { NextResponse } from "next/server";
import { getBackendCode } from "@/lib/design/backend-code";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getBackendCode(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Backend Code "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    backendCodeId: record.id,
    backendDesignId: record.backendDesignId,
    projectId: record.planId,
    files: record.content.files,
    backendCode: record,
  });
}
