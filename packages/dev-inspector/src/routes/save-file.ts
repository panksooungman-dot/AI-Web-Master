import { NextResponse } from "next/server";
import fs from "node:fs";
import { resolveSafeSourcePath } from "../safe-source-path";

/**
 * "AI로 수정 요청"(ai-edit) 미리보기를 사용자가 확인한 뒤 실제로 파일에 쓰는 적용 단계.
 * save-style처럼 특정 속성만 바꾸는 게 아니라 파일 전체 내용을 그대로 덮어쓴다 —
 * ai-edit이 만든 제안을 사용자가 확인하고 명시적으로 "적용"을 눌렀을 때만 호출된다.
 */

interface SaveFileRequest {
  file?: string;
  content?: string;
}

export async function saveFileHandler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, reason: "disabled" }, { status: 403 });
  }

  let body: SaveFileRequest;
  try {
    body = (await request.json()) as SaveFileRequest;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const { file, content } = body;
  if (typeof file !== "string" || !file || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const absolutePath = resolveSafeSourcePath(file);
  if (!absolutePath) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  fs.writeFileSync(absolutePath, content, "utf-8");

  return NextResponse.json({ success: true });
}
