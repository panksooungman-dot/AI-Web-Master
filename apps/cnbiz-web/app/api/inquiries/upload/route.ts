import { NextResponse } from "next/server";
import path from "node:path";
import { saveUploadedFile } from "@/lib/uploads/storage";

/**
 * `/developer/inquiries/new`의 첨부파일 업로드 백엔드. `POST /api/inquiries`(Inquiry 생성) 전에
 * 파일 하나당 한 번씩 호출해 실제 URL(이미지 등)이나 텍스트 내용(코드 파일)을 먼저 확보한
 * 다음, 그 결과를 lib/inquiries/types.ts의 uploadedFiles/codeSnippets로 Inquiry 생성 요청에
 * 실어 보낸다 — 기본적으로 "developer" 역할 게이팅(이 경로가 UNGATED_API_PREFIXES에 없으므로
 * lib/auth/rbac.ts 기본 규칙 적용)이라 관리자 세션이 있어야 호출 가능하다.
 */

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rb", ".php", ".c", ".cpp", ".cs",
  ".css", ".scss", ".html", ".json", ".md", ".yml", ".yaml", ".sh", ".sql", ".vue", ".swift", ".kt",
]);

const MAX_BINARY_BYTES = 20 * 1024 * 1024; // 20MB — 관리자 폼(ACCEPTED_EXTENSIONS)과 동일한 상한
const MAX_CODE_BYTES = 500 * 1024; // 500KB — AI 프롬프트에 그대로 포함되므로 훨씬 작게 제한

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "파일이 필요합니다." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase();

  if (CODE_EXTENSIONS.has(ext)) {
    if (file.size > MAX_CODE_BYTES) {
      return NextResponse.json(
        { success: false, error: `코드 파일은 ${MAX_CODE_BYTES / 1024}KB 이하만 지원합니다.` },
        { status: 400 },
      );
    }
    const content = await file.text();
    return NextResponse.json({ success: true, type: "code", filename: file.name, content });
  }

  if (file.size > MAX_BINARY_BYTES) {
    return NextResponse.json(
      { success: false, error: `파일 크기는 ${MAX_BINARY_BYTES / (1024 * 1024)}MB 이하만 지원합니다.` },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await saveUploadedFile({ name: file.name, type: file.type, buffer });
    return NextResponse.json({
      success: true,
      type: IMAGE_EXTENSIONS.has(ext) ? "image" : "file",
      url: saved.url,
      storage: saved.storage,
    });
  } catch (error) {
    console.error("[api/inquiries/upload] failed", error);
    return NextResponse.json({ success: false, error: "파일 업로드에 실패했습니다." }, { status: 500 });
  }
}
