import { NextResponse } from "next/server";
import { listInquiries } from "@/lib/inquiries/registry";

/** Admin-only (RBAC default: /api/inquiries is not in UNGATED_API_PREFIXES). Lists newest first. */
export async function GET() {
  return NextResponse.json({ inquiries: await listInquiries() });
}
