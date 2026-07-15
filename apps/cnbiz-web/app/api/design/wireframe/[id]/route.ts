import { NextResponse } from "next/server";
import { getWireframe } from "@/lib/design/wireframe";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** docs/03_DESIGN 스펙의 `GET /api/design/wireframe/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getWireframe(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Wireframe "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    wireframeId: record.id,
    projectId: record.planId,
    layouts: record.content.layouts,
    components: record.content.components,
    responsive: record.content.responsive,
    wireframe: record,
  });
}
