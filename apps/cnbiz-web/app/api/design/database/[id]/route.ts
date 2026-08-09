import { NextResponse } from "next/server";
import { getDatabaseDesign } from "@/lib/design/database-design";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getDatabaseDesign(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Database Design "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    databaseDesignId: record.id,
    projectId: record.planId,
    tables: record.content.tables,
    relationships: record.content.relationships,
    databaseDesign: record,
  });
}
