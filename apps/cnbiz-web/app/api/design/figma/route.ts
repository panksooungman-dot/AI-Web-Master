import { NextResponse } from "next/server";
import { listFigmaRecords } from "@/lib/design/figma";

export async function GET() {
  return NextResponse.json({ figmaFiles: await listFigmaRecords() });
}
