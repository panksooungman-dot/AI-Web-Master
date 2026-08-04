import { NextResponse } from "next/server";
import { getTimeline } from "@/lib/timeline/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const timeline = await getTimeline(id);

  if (!timeline) {
    return NextResponse.json({ error: "프로젝트 일정을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ timeline });
}
