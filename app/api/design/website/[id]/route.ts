import { NextResponse } from "next/server";
import { getWebsiteBuildRecord } from "@/lib/design/website-build";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** `GET /api/design/website/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = getWebsiteBuildRecord(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Build "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    buildId: record.id,
    projectId: record.planId,
    reviewId: record.reviewId,
    websiteId: record.websiteId,
    siteType: record.siteType,
    status: record.status,
    simulatedContent: record.simulatedContent,
    version: record.version,
    build: record,
  });
}
