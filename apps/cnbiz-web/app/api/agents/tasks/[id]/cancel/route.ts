import { NextResponse } from "next/server";
import { taskQueue } from "@/lib/agents/taskQueue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const cancelled = taskQueue.cancel(id);

  if (!cancelled) {
    return NextResponse.json(
      { success: false, error: "취소할 수 없는 작업입니다." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, task: taskQueue.getTask(id) });
}
