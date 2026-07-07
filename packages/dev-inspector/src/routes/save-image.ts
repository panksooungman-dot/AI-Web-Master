import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resolveSafeSourcePath } from "../safe-source-path";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-80) || "image";
}

export async function saveImageHandler(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, reason: "disabled" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const componentFile = formData.get("componentFile");
  const oldSrc = formData.get("oldSrc");

  if (
    !(file instanceof File) ||
    typeof componentFile !== "string" ||
    typeof oldSrc !== "string" ||
    !oldSrc
  ) {
    return NextResponse.json({ success: false, reason: "invalid-request" }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_BYTES || !file.type.startsWith("image/")) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  const absoluteComponentPath = resolveSafeSourcePath(componentFile);
  if (!absoluteComponentPath) {
    return NextResponse.json({ success: false, reason: "invalid-file" }, { status: 400 });
  }

  const root = process.cwd();
  const uploadsDir = path.join(root, "public", "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const ext = path.extname(file.name) || ".png";
  const baseName = sanitizeFileName(path.basename(file.name, ext));
  const fileName = `${Date.now()}-${baseName}${ext}`;
  const destPath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  const newSrc = `/uploads/${fileName}`;

  const content = fs.readFileSync(absoluteComponentPath, "utf-8");
  const occurrences = content.split(oldSrc).length - 1;

  if (occurrences === 0) {
    return NextResponse.json({ success: false, reason: "not-found", newSrc });
  }

  if (occurrences > 1) {
    return NextResponse.json({ success: false, reason: "ambiguous", occurrences, newSrc });
  }

  fs.writeFileSync(absoluteComponentPath, content.replace(oldSrc, newSrc), "utf-8");

  return NextResponse.json({ success: true, changed: true, newSrc });
}
