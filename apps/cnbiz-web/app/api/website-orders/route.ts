import { NextResponse } from "next/server";
import { listWebsiteOrders } from "@/lib/websiteOrders/registry";

/** Admin-only (RBAC default: /api/website-orders is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ websiteOrders: await listWebsiteOrders() });
}
