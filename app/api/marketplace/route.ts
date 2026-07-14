import { NextResponse } from "next/server";
import { getCatalogSummary, listInstalled } from "@/lib/marketplace/registry";

export async function GET() {
  return NextResponse.json({ catalog: getCatalogSummary(), installed: listInstalled() });
}
