import { NextResponse } from "next/server";
import { setInstalled } from "@/lib/marketplace/registry";

interface RouteParams {
  params: Promise<{ name: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { name } = await params;
  const installed = setInstalled(decodeURIComponent(name), true);

  return NextResponse.json({ success: true, installed });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { name } = await params;
  const installed = setInstalled(decodeURIComponent(name), false);

  return NextResponse.json({ success: true, installed });
}
