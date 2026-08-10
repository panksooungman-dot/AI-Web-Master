import { NextResponse } from "next/server";
import { getBackendDesign } from "@/lib/design/backend-design";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getBackendDesign(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Backend Design "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    backendDesignId: record.id,
    apiDesignId: record.apiDesignId,
    projectId: record.planId,
    logic: record.content.logic,
    backendDesign: record,
  });
}
