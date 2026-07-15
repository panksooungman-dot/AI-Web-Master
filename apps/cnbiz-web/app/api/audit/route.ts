import { NextResponse } from "next/server";
import { listAuditEvents, type AuditAction } from "@/lib/audit/log";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action") as AuditAction | null;
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const entries = await listAuditEvents({
    action: action ?? undefined,
    limit: typeof limit === "number" && Number.isFinite(limit) ? limit : undefined,
  });

  return NextResponse.json({ entries });
}
