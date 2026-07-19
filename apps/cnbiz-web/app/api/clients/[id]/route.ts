import { NextResponse } from "next/server";
import { getClient } from "@/lib/clients/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET만 제공한다 — Client는 Inquiry/WebsiteOrder 같은 상태 전이(status)가 없는 순수 신원
 * 레코드라 관리자가 직접 편집할 필드가 없다(연락처 정정 등은 이번 범위 밖).
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getClient(id);

  if (!record) {
    return NextResponse.json({ error: "고객사를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ client: record });
}
