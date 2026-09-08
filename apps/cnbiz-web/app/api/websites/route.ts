import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { execute } from "@/lib/commandEngine/engine";
import { createWebsiteRecord, listWebsites } from "@/lib/websites/registry";
import { WEBSITE_TYPES } from "@/lib/websites/types";
import { getWireframe } from "@/lib/design/wireframe";
import { generatePrototype } from "@/lib/design/prototype-generator";
import { createPrototype } from "@/lib/design/prototype";
import { prototypeToDesignDocument } from "@/lib/design/claude-design-document-adapter";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";
import { incrementMetric } from "@/lib/metrics/registry";
import { resolveCliEntry, resolveCliWorkingDir, resolveGeneratedWebsitesDir } from "@/lib/paths/repoRoot";

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
  return NextResponse.json({ websites: await listWebsites() });
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

  const cliEntry = resolveCliEntry();

  if (!cliEntry) {
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
  const outDir = outDirInput || resolveGeneratedWebsitesDir(slug);

  // 관리자가 Storyboard·Wireframe을 미리 만들고 편집한 뒤 "생성 시작"을 눌렀을 때만 존재한다
  // (`/developer/websites`의 3단계 마법사 — 폼 → Storyboard/Wireframe 생성 → Wireframe Board
  // 편집 → 생성). 없으면 기존과 완전히 동일하게 동작한다(하위 호환, 회귀 없음).
  const wireframeId = str(body, "wireframeId");
  let documentPath: string | null = null;
  let designPageCount = 0;
  let designPageTotal = 0;

  if (wireframeId) {
    const wireframe = await getWireframe(wireframeId);
    if (!wireframe) {
      return NextResponse.json(
        { success: false, error: `Wireframe "${wireframeId}"을(를) 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    // Wireframe의 화면 구성(content.layouts, 관리자가 방금 편집한 값)을 Prototype 생성을 거쳐
    // React Generator가 실제로 읽는 DesignDocument로 바꾼다 — `wireframeToDesignDocument()`
    // (Phase 3→4 Adapter)만으로는 `pages[].sections`가 항상 빈 배열이라 실제 컴포넌트 구성이
    // 코드에 반영되지 않는다. Prototype(Phase 4)이 만드는 interactionMap을 거쳐야
    // `prototypeToDesignDocument()`(Phase 4→6 Adapter)가 그 구성을 sections로 채운다 —
    // Design Automation의 정식 흐름(Phase 9, `/api/design/website`)이 Review 승인까지
    // 요구하는 것과 달리, 이 빠른 생성 경로는 Claude Design/Review 단계 없이 Prototype
    // 산출물을 그 자리에서만 사용하고 저장은 정상적으로 남긴다(다른 Phase 산출물처럼
    // History에 그대로 쌓임 — 별도 정리 불필요).
    const { content, simulated: protoSimulated, provider, model } = await generatePrototype(wireframe);
    const prototypeRecord = await createPrototype({
      wireframeId,
      planId: wireframe.planId,
      content,
      simulated: protoSimulated,
      provider,
      model,
    });

    const document = prototypeToDesignDocument(prototypeRecord);
    designPageTotal = document.pages.length;
    designPageCount = document.pages.filter((p) => p.sections.length > 0).length;

    documentPath = path.join(resolveCliWorkingDir(), `design-document-quickbuild-${wireframeId}.json`);
    await fs.writeFile(documentPath, JSON.stringify(document), "utf-8");
  }

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
    ...(documentPath ? [`--design-document "${documentPath}"`] : []),
  ];

  let result;
  try {
    result = await execute(`node ${args.join(" ")}`, { cwd: resolveCliWorkingDir(), category: "development" });
  } finally {
    if (documentPath) await fs.rm(documentPath, { force: true }).catch(() => {});
  }

  const simulatedContent = /No LLM provider connected/i.test(result.stdout);

  const record = await createWebsiteRecord({
    name,
    siteType,
    outDir,
    status: result.success ? "Success" : "Failed",
    simulatedContent,
    error: result.success ? undefined : result.error ?? (result.stderr.trim() || "생성 실패"),
  });

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "website.generate",
    actor,
    success: result.success,
    detail: result.success
      ? `"${name}" (${siteType}) 생성됨` +
        (documentPath ? ` — Wireframe 레이아웃 반영(${designPageTotal}개 페이지 중 ${designPageCount}개)` : "")
      : record.error ?? "생성 실패",
  });
  await incrementMetric("websiteGenerationCount");

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: record.error, website: record, output: result.stdout },
      { status: 500 }
    );
  }

  if (documentPath) {
    return NextResponse.json({ success: true, website: record, output: result.stdout, designPageCount, designPageTotal });
  }

  return NextResponse.json({ success: true, website: record, output: result.stdout });
}
