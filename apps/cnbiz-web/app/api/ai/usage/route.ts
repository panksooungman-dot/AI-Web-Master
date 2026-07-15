import { NextResponse } from "next/server";
import { listUsageViaCli } from "@/lib/ai/bridge";

export async function GET() {
  const result = await listUsageViaCli();
  return NextResponse.json(result);
}
