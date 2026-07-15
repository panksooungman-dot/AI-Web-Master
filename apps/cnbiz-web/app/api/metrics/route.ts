import { NextResponse } from "next/server";
import { getMetricsSummary } from "@/lib/metrics/registry";

export async function GET() {
  const summary = await getMetricsSummary();
  return NextResponse.json(summary);
}
