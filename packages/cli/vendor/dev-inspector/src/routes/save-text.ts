import { NextResponse } from "next/server";
import fs from "node:fs";
import { resolveSafeSourcePath } from "../safe-source-path";

interface SaveTextRequest {
  file?: string;
  before?: string;
  after?: string;
}

export async function saveTextHandler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, reason: "disabled" }, { status: 403 });
  }

  let body: SaveTextRequest;
  try {
    body = (await request.json()) as SaveTextRequest;
  } catch {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const { file, before, after } = body;

  if (
    typeof file !== "string" ||
    typeof before !== "string" ||
    typeof after !== "string" ||
    !before
  ) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  const absolutePath = resolveSafeSourcePath(file);
  if (!absolutePath) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  if (before === after) {
    return NextResponse.json({ success: true, changed: false });
  }

  const content = fs.readFileSync(absolutePath, "utf-8");
  const occurrences = content.split(before).length - 1;

  if (occurrences === 0) {
    return NextResponse.json({ success: false, reason: "not-found" });
  }

  if (occurrences > 1) {
    return NextResponse.json({ success: false, reason: "ambiguous", occurrences });
  }

  fs.writeFileSync(absolutePath, content.replace(before, after), "utf-8");

  return NextResponse.json({ success: true, changed: true, file });
}
