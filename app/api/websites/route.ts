import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { execute } from "@/lib/commandEngine/engine";
import { createWebsiteRecord, listWebsites } from "@/lib/websites/registry";
import { WEBSITE_TYPES } from "@/lib/websites/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? (body[key] as string).trim() : "";
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return slug || "website";
}

export async function GET() {
  return NextResponse.json({ websites: listWebsites() });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const name = str(body, "name");
  const businessType = str(body, "businessType");
  const audience = str(body, "audience");
  const brand = str(body, "brand") || name;
  const language = str(body, "language") || "Korean";
  const siteTypeInput = str(body, "siteType");
  const siteType = WEBSITE_TYPES.some((t) => t.id === siteTypeInput) ? siteTypeInput : "website";

  if (!name || !businessType || !audience) {
    return NextResponse.json(
      { success: false, error: "Project Name·Business Type·Target Audience는 필수입니다." },
      { status: 400 }
    );
  }

  const repoRoot = process.cwd();
  const cliEntry = path.join(repoRoot, "packages", "cli", "dist", "index.js");

  if (!fs.existsSync(cliEntry)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "packages/cli가 아직 빌드되지 않았습니다. `npm run build --workspace=@ai-business-os/cli`를 먼저 실행하세요.",
      },
      { status: 400 }
    );
  }

  const slug = slugify(name);
  const outDirInput = str(body, "outDir");
  const outDir = outDirInput || path.join(repoRoot, ".generated-websites", slug);

  const args = [
    `"${cliEntry}"`,
    "website",
    "create",
    `--name "${name}"`,
    `--type "${businessType}"`,
    `--audience "${audience}"`,
    `--brand "${brand}"`,
    `--language "${language}"`,
    `--site-type "${siteType}"`,
    `--out "${outDir}"`,
  ];

  const result = await execute(`node ${args.join(" ")}`, { cwd: repoRoot, category: "development" });

  const simulatedContent = /No LLM provider connected/i.test(result.stdout);

  const record = createWebsiteRecord({
    name,
    siteType,
    outDir,
    status: result.success ? "Success" : "Failed",
    simulatedContent,
    error: result.success ? undefined : result.error ?? (result.stderr.trim() || "생성 실패"),
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: record.error, website: record, output: result.stdout },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, website: record, output: result.stdout });
}
