import { NextResponse } from "next/server";
import { workflowEngine } from "@/lib/workflows/engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const resumed = workflowEngine.resume(id);

  if (!resumed) {
    return NextResponse.json(
      { success: false, error: "재개할 수 없는 상태입니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, run: workflowEngine.getRun(id) });
}
