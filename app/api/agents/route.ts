import { NextResponse } from "next/server";
import { listAgentSummaries } from "@/lib/agents/registry";

export async function GET() {
  const agents = await listAgentSummaries();
  return NextResponse.json({ agents });
}
