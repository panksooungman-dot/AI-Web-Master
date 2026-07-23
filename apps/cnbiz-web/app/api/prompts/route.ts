import { NextResponse } from "next/server";
import { createPrompt, listPrompts } from "@/lib/prompts/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

function stringArrayField(body: Record<string, unknown>, key: string): string[] | undefined {
  const value = body[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const prompts = await listPrompts();
  const filtered = category ? prompts.filter((prompt) => prompt.category === category) : prompts;
  return NextResponse.json({ prompts: filtered });
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json({ success: false, error: "잘못된 요청입니다." }, { status: 400 });
    }

    const name = stringField(body, "name");
    const description = stringField(body, "description");
    const content = stringField(body, "content");
    const category = stringField(body, "category") || "General";
    const variables = stringArrayField(body, "variables");

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: "name·content는 필수입니다." },
        { status: 400 }
      );
    }

    const prompt = await createPrompt(name, description, content, category, variables);

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
