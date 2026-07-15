import { NextResponse } from "next/server";
import { taskQueue } from "@/lib/agents/taskQueue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const retried = taskQueue.retry(id);

  if (!retried) {
    return NextResponse.json(
      { success: false, error: "재시도할 수 없는 작업입니다 (Failed 상태만 재시도 가능)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, task: retried });
}
