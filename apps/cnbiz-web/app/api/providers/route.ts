import { NextResponse } from "next/server";
import { getProviderStatuses } from "@/lib/providers/status";

export async function GET() {
  const providers = await getProviderStatuses();
  return NextResponse.json({ providers });
}
