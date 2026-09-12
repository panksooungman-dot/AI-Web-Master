import { NextResponse } from "next/server";
import path from "node:path";
import { saveUploadedFile } from "@/lib/uploads/storage";
import { getClientIp, isRateLimited } from "@/lib/inquiries/spam";

/**
 * `/developer/inquiries/new`(관리자)와 공개 문의 폼(components/sections/ContactForm.tsx)이
 * 공유하는 첨부파일 업로드 백엔드. `POST /api/inquiries`(Inquiry 생성) 전에 파일 하나당 한 번씩
 * 호출해 실제 URL(이미지 등)이나 텍스트 내용(코드 파일)을 먼저 확보한 다음, 그 결과를
 * lib/inquiries/types.ts의 uploadedFiles/codeSnippets로 Inquiry 생성 요청에 실어 보낸다.
 * `POST /api/inquiries`와 동일하게 UNGATED_EXACT_ROUTES(lib/auth/rbac.ts)로 로그인 없이 호출
 * 가능하며, 익명 호출자도 받게 되므로 동일한 IP 기준 rate limit을 적용한다.
 */

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rb", ".php", ".c", ".cpp", ".cs",
  ".css", ".scss", ".html", ".json", ".md", ".yml", ".yaml", ".sh", ".sql", ".vue", ".swift", ".kt",
  // .txt/.csv는 순수 텍스트지만 이 목록에 없어 첨부해도 텍스트로 읽히지 않고 바이너리 URL로만
  // 저장되고 있었다 — app/developer/inquiries/new/page.tsx의 ACCEPTED_EXTENSIONS는 이미 이
  // 둘을 "텍스트 파일"로 안내하고 있고, lib/inquiries/extractContact.ts(파일에서 자동
  // 채우기)·AI Analysis 프롬프트 둘 다 텍스트 내용이 있어야만 동작하므로 함께 추가한다
  // (2026-09-12 발견).
  ".txt", ".csv",
]);

const MAX_BINARY_BYTES = 20 * 1024 * 1024; // 20MB — 관리자 폼(ACCEPTED_EXTENSIONS)과 동일한 상한
const MAX_CODE_BYTES = 500 * 1024; // 500KB — AI 프롬프트에 그대로 포함되므로 훨씬 작게 제한

export async function POST(request: Request) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

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
