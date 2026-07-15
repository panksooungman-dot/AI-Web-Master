import { NextResponse } from "next/server";
import { getStoryboard } from "@/lib/design/storyboard";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** docs/03_DESIGN 스펙의 `GET /api/design/storyboard/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getStoryboard(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Storyboard "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    storyboardId: record.id,
    projectId: record.planId,
    screens: record.content.screenDescriptions,
    flow: record.content.screenFlow,
    storyboard: record,
  });
}
