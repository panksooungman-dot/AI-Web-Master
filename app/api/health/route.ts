import { NextResponse } from "next/server";
import { getDiskUsage, getGitStatus, getSystemInfo, readHealthCache } from "@/lib/health/checks";

export async function GET() {
  const cwd = process.cwd();

  const [git, cache, system] = await Promise.all([
    getGitStatus(cwd),
    Promise.resolve(readHealthCache()),
    getSystemInfo(cwd),
  ]);

  return NextResponse.json({
    git,
    disk: getDiskUsage(cwd),
    cache,
    system,
  });
}
