import { NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CD_PATTERN = /^cd(?:\s+(.*))?$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function resolveCdTarget(cwd: string, rawTarget: string): string {
  const target = stripQuotes(rawTarget.trim());

  if (!target) return cwd;
  if (target === "~") return os.homedir();

  return path.resolve(cwd, target);
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

    const trimmed = command.trim();

    if (!trimmed) {
      return NextResponse.json(
        { success: false, error: "실행할 명령어를 입력하세요.", cwd },
        { status: 400 }
      );
    }

    const cdMatch = trimmed.match(CD_PATTERN);

    if (cdMatch) {
      const resolved = resolveCdTarget(cwd, cdMatch[1] ?? "");

      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        return NextResponse.json(
          {
            success: false,
            error: `경로를 찾을 수 없습니다: ${cdMatch[1] ?? resolved}`,
            cwd,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, output: "", cwd: resolved });
    }

    const output = await new Promise<string>((resolve, reject) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${trimmed}`,
        ],
        {
          cwd,
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

    return NextResponse.json({ success: true, output, cwd });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";

    return NextResponse.json(
      { success: false, error: message, cwd },
      { status: 500 }
    );
  }
}
