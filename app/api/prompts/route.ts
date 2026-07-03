import { NextResponse } from "next/server";
import { createPrompt, listPrompts } from "@/lib/prompts/registry";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key].trim() : "";
}

export async function GET() {
  return NextResponse.json({ prompts: listPrompts() });
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

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: "name·content는 필수입니다." },
        { status: 400 }
      );
    }

    const prompt = createPrompt(name, description, content);

    return NextResponse.json({ success: true, prompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
