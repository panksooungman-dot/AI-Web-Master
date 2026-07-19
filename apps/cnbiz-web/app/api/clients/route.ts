import { NextResponse } from "next/server";
import { listClients } from "@/lib/clients/registry";

/** Admin-only (RBAC default: /api/clients is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ clients: await listClients() });
}
