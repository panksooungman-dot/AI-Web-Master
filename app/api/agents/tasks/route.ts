import { NextResponse } from "next/server";
import { taskQueue } from "@/lib/agents/taskQueue";

export async function GET() {
  return NextResponse.json({ tasks: taskQueue.listTasks() });
}
