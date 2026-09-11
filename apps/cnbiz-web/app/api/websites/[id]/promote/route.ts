import { NextResponse } from "next/server";
import { promoteWebsiteToProduction } from "@/lib/deployment/promote";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * "미리보기 확인 후 운영 배포" — 관리자가 Preview URL을 실제로 확인한 뒤 여기를 호출해야만
 * 그 Website의 배포가 운영 도메인으로 승격된다(lib/deployment/promote.ts 참고).
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const actor = await getCurrentActorEmail();
  const result = await promoteWebsiteToProduction(id, actor);

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
