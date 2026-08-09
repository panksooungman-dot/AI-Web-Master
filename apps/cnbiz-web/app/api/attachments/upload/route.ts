import { NextResponse } from "next/server";
import { getDefaultAttachmentStore } from "@/lib/storage";
import { ACCEPTED_EXTENSIONS, MAX_FILE_SIZE_BYTES, isAcceptedFileName } from "@/lib/attachments/policy";

/**
 * "developer"-gated by default (proxy.ts + lib/auth/rbac.ts, this path isn't in any ungated
 * list) — only app/developer/inquiries/new/page.tsx calls this today. Accepts a single file per
 * request (`multipart/form-data`, field name "file") so the frontend can report per-file
 * progress/errors independently rather than one request succeeding or failing as a batch.
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "file 필드가 필요합니다." }, { status: 400 });
  }

  if (!isAcceptedFileName(file.name)) {
    return NextResponse.json(
      { success: false, error: `지원하지 않는 파일 형식입니다. (허용: ${ACCEPTED_EXTENSIONS.join(", ")})` },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ success: false, error: "파일 크기가 너무 큽니다. (최대 20MB)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const store = getDefaultAttachmentStore();
    const stored = await store.save({
      name: file.name,
      contentType: file.type || "application/octet-stream",
      buffer,
    });

    return NextResponse.json({ success: true, ...stored });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "파일 업로드에 실패했습니다." },
      { status: 500 }
    );
  }
}
