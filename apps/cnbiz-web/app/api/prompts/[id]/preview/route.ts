import { NextResponse } from "next/server";
import { getPrompt, getLatestVersion } from "@/lib/prompts/registry";
import { renderPromptContent } from "@/lib/prompts/render";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const prompt = await getPrompt(id);

  if (!prompt) {
    return NextResponse.json({ success: false, error: "프롬프트를 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const body: unknown = await request.json().catch(() => ({}));
    const versionNumber = isRecord(body) && typeof body.version === "number" ? body.version : undefined;
    const variables = isRecord(body) && isRecord(body.variables) ? (body.variables as Record<string, unknown>) : {};

    const version = versionNumber
      ? prompt.versions.find((v) => v.version === versionNumber)
      : getLatestVersion(prompt);

    if (!version) {
      return NextResponse.json({ success: false, error: "버전을 찾을 수 없습니다." }, { status: 404 });
    }

    const stringVariables: Record<string, string> = {};
    for (const [key, value] of Object.entries(variables)) {
      stringVariables[key] = typeof value === "string" ? value : String(value);
    }

    const rendered = renderPromptContent(version.content, stringVariables);

    return NextResponse.json({ success: true, rendered, version: version.version });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
