import { NextResponse } from "next/server";
import { executeShellCommand, isShell } from "@/lib/terminal/server";
import type { Shell } from "@/lib/settings/store";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET() {
  return NextResponse.json({ cwd: process.cwd() });
}

export async function POST(request: Request) {
  let cwd = process.cwd();

  try {
    const body: unknown = await request.json();
    const command =
      isRecord(body) && typeof body.command === "string" ? body.command : "";

    if (isRecord(body) && typeof body.cwd === "string" && body.cwd.trim()) {
      cwd = body.cwd;
    }

    const shell: Shell =
      isRecord(body) && isShell(body.shell) ? body.shell : "PowerShell";

    if (!command.trim()) {
      return NextResponse.json(
        { success: false, error: "실행할 명령어를 입력하세요.", cwd },
        { status: 400 }
      );
    }

    const result = await executeShellCommand(command, cwd, { shell });

    return NextResponse.json(result, { status: result.status ?? 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";

    return NextResponse.json(
      { success: false, error: message, cwd },
      { status: 500 }
    );
  }
}
