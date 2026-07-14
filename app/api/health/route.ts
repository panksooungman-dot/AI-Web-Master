import { NextResponse } from "next/server";
import { getDiskUsage, getGitStatus, readHealthCache } from "@/lib/health/checks";

export async function GET() {
  const cwd = process.cwd();

  const [git, cache] = await Promise.all([
    getGitStatus(cwd),
    Promise.resolve(readHealthCache()),
  ]);

  return NextResponse.json({
    git,
    disk: getDiskUsage(cwd),
    cache,
  });
}
