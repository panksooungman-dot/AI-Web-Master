import { NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(request: Request) {
  try {
    const { command } = await request.json();

    if (!command || typeof command !== "string" || command.trim() === "") {
      return NextResponse.json(
        { success: false, error: "실행할 명령어를 입력하세요." },
        { status: 400 }
      );
    }

    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${command}`,
        ],
        {
          cwd: process.cwd(),
          windowsHide: true,
        }
      );

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("error", (error) => {
        reject(error);
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout || stderr);
        } else {
          reject(new Error(stderr || `종료 코드 ${code}`));
        }
      });
    });

    return NextResponse.json({
      success: true,
      output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
