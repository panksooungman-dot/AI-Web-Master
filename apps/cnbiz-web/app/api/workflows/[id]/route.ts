import { NextResponse } from "next/server";
import { getWorkflow } from "@/lib/workflows/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const workflow = await getWorkflow(id);

  if (!workflow) {
    return NextResponse.json({ error: "워크플로를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ workflow });
}
