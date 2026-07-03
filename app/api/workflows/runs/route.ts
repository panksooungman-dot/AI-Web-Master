import { NextResponse } from "next/server";
import { workflowEngine } from "@/lib/workflows/engine";

export async function GET() {
  return NextResponse.json({ runs: workflowEngine.listRuns() });
}
