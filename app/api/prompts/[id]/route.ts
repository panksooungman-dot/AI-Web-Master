import { NextResponse } from "next/server";
import { addPromptVersion, getPrompt } from "@/lib/prompts/registry";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const prompt = getPrompt(id);

  if (!prompt) {
    return NextResponse.json({ error: "프롬프트를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ prompt });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body: unknown = await request.json();
    const content =
      isRecord(body) && typeof body.content === "string" ? body.content.trim() : "";
    const variables =
      isRecord(body) && Array.isArray(body.variables)
        ? body.variables.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : undefined;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "content는 필수입니다." },
        { status: 400 }
      );
    }

    const prompt = addPromptVersion(id, content, variables);

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "프롬프트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
