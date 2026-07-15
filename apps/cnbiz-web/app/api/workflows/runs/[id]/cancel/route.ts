import { NextResponse } from "next/server";
import { workflowEngine } from "@/lib/workflows/engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const cancelled = workflowEngine.cancel(id);

  if (!cancelled) {
    return NextResponse.json(
      { success: false, error: "취소할 수 없는 상태입니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, run: workflowEngine.getRun(id) });
}
