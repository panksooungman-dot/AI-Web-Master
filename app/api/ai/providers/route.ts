import { NextResponse } from "next/server";
import { listProvidersViaCli } from "@/lib/ai/bridge";

export async function GET() {
  const result = await listProvidersViaCli();
  return NextResponse.json(result);
}
