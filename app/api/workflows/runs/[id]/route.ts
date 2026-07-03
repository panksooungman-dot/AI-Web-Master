import { NextResponse } from "next/server";
import { workflowEngine } from "@/lib/workflows/engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const run = workflowEngine.getRun(id);

  if (!run) {
    return NextResponse.json({ error: "실행 기록을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ run });
}
