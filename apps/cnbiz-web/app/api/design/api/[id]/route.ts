import { NextResponse } from "next/server";
import { getApiDesign } from "@/lib/design/api-design";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getApiDesign(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `API Design "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    apiDesignId: record.id,
    databaseDesignId: record.databaseDesignId,
    projectId: record.planId,
    endpoints: record.content.endpoints,
    apiDesign: record,
  });
}
