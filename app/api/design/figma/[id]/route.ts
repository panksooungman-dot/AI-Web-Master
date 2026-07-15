import { NextResponse } from "next/server";
import { getFigmaRecord } from "@/lib/design/figma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/figma/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getFigmaRecord(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Figma File "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    figmaId: record.id,
    projectId: record.planId,
    fileId: record.figmaFileId,
    pages: record.content.pages,
    components: record.content.components,
    tokens: record.content.tokens,
    assets: record.content.assets,
    figma: record,
  });
}
