import { NextResponse } from "next/server";
import { getInstalledPackages } from "@/lib/marketplace/registry";

export async function GET() {
  const { success, installed, error } = await getInstalledPackages();
  return NextResponse.json({ success, installed, error });
}
