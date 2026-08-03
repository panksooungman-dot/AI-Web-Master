import { NextResponse } from "next/server";
import { getEstimate } from "@/lib/estimates/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const estimate = await getEstimate(id);

  if (!estimate) {
    return NextResponse.json({ error: "견적서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ estimate });
}
