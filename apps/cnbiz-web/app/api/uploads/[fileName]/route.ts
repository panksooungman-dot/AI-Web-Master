import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolveLocalUploadPath } from "@/lib/uploads/storage";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

/**
 * SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY가 없을 때 lib/uploads/storage.ts가 쓰는 로컬 fs
 * 폴백을 서빙한다. 파일명은 storage.ts의 safeFileName()이 randomUUID()-접두사 + 영숫자/한글만
 * 남긴 basename으로 생성하므로, 경로 조작(`../`) 문자가 애초에 만들어지지 않는다 — 그래도
 * path.basename()으로 한 번 더 방어한다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
  const { fileName } = await params;
  const safeName = path.basename(fileName);
  const filePath = resolveLocalUploadPath(safeName);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ success: false, error: "파일을 찾을 수 없습니다." }, { status: 404 });
  }

  const buffer = await readFile(filePath);
  const ext = path.extname(safeName).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
