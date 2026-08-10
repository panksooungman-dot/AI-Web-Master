import { NextResponse } from "next/server";
import { getDatabaseCode } from "@/lib/design/database-code";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getDatabaseCode(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Database Code "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    databaseCodeId: record.id,
    databaseDesignId: record.databaseDesignId,
    projectId: record.planId,
    files: record.content.files,
    databaseCode: record,
  });
}
