import { NextResponse } from "next/server";
import { listRequests } from "@/lib/requests/registry";

/** Admin-only (RBAC default: /api/requests is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ requests: await listRequests() });
}
