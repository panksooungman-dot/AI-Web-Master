import { NextResponse } from "next/server";
import { taskQueue } from "@/lib/agents/taskQueue";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const task = taskQueue.getTask(id);

  if (!task) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ task });
}
