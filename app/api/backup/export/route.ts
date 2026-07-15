import { NextResponse } from "next/server";
import { exportBackup } from "@/lib/backup/registry";

export async function GET() {
  const bundle = exportBackup();

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="ai-business-os-backup-${Date.now()}.json"`,
    },
  });
}
