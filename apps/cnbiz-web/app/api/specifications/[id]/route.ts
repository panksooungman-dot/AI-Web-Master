import { NextResponse } from "next/server";
import { getSpecification } from "@/lib/specifications/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const specification = await getSpecification(id);

  if (!specification) {
    return NextResponse.json({ error: "기능 명세서를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ specification });
}
