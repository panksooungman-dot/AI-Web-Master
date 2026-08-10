import { NextResponse } from "next/server";
import { getCrudFrontend } from "@/lib/design/crud-frontend";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getCrudFrontend(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `CRUD Frontend "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    crudFrontendId: record.id,
    apiCodeId: record.apiCodeId,
    projectId: record.planId,
    files: record.content.files,
    crudFrontend: record,
  });
}
