import { NextResponse } from "next/server";
import { listAiJobs } from "@/lib/aiJobs/registry";

/** Admin-only (RBAC default: /api/ai-jobs is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ aiJobs: await listAiJobs() });
}
