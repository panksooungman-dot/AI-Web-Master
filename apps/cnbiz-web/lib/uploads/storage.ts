import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

/**
 * Inquiry 첨부파일(이미지 등) 저장소. lib/db/index.ts의 getDefaultStore()와 동일한 원칙 —
 * SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY가 있으면 Supabase Storage를, 없으면 로컬 fs
 * 폴백을 쓴다. lib/db와 달리 프로덕션에서 없다고 예외를 던지지 않는다 — 첨부파일은 Inquiry
 * 접수 자체를 막을 이유가 없는 보조 기능이라(score.ts의 완결성 체크리스트 항목 중 하나일
 * 뿐), 설정이 없으면 조용히 fs 폴백으로 계속 동작한다.
 *
 * fs 폴백 경로는 `os.tmpdir()` 기준이어야 한다 — `process.cwd()` 기준으로 두면
 * lib/paths/repoRoot.ts의 resolveGeneratedWebsitesDir()/resolveCliWorkingDir() 주석에 이미
 * 기록된 것과 동일한 원인(Vercel 배포 함수의 파일시스템은 `/tmp` 밖에서 읽기 전용,
 * 2026-08-05 프로덕션 로그로 확인된 "ENOENT ... mkdir '/var/task/...'")으로 SUPABASE_URL
 * 미설정 시 첨부파일 업로드가 프로덕션에서 항상 실패한다. 다만 `/tmp`도 Lambda 인스턴스마다
 * 격리·휘발성이라, 업로드(POST)와 이후 서빙(GET /api/uploads/[fileName])이 서로 다른
 * 인스턴스에서 처리되면 파일을 못 찾을 수 있다 — 이 fs 폴백은 로컬 개발 전용으로 보고,
 * 프로덕션에서 첨부파일을 신뢰성 있게 쓰려면 SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY를
 * 반드시 설정해야 한다(에러를 던지지 않는 이유는 위 문단대로 "첨부파일 실패가 Inquiry 접수
 * 자체를 막으면 안 된다"는 원칙 때문이지, fs 폴백이 프로덕션에서 신뢰할 수 있다는 뜻이
 * 아니다).
 */

const BUCKET = "inquiry-uploads";
const UPLOAD_DIR = path.join(os.tmpdir(), "ai-business-os-cnbiz-web", "inquiry-uploads");

export interface SavedFile {
  url: string;
  storage: "supabase" | "local";
}

function safeFileName(name: string): string {
  const ext = path.extname(name).slice(0, 20);
  const base = path
    .basename(name, ext)
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "_")
    .slice(0, 60);
  return `${randomUUID()}-${base || "file"}${ext}`;
}

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** SUPABASE_URL이 로컬 개발용 fs 폴백 경로에서 만든 상대 URL을 절대 URL로 못 바꿀 때(요청
 *  컨텍스트 밖) 대비해, 항상 앱 자신의 /api/uploads 경로로 상대 URL을 반환한다 — 실제 절대
 *  URL로의 변환은 브라우저/이미지 fetch 시점에 자연히 이뤄진다. */
export async function saveUploadedFile(input: {
  name: string;
  type: string;
  buffer: Buffer;
}): Promise<SavedFile> {
  const fileName = safeFileName(input.name);
  const supabase = getSupabaseClient();

  if (supabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, input.buffer, { contentType: input.type || "application/octet-stream" });

    if (error) {
      throw new Error(`[uploads/storage] Supabase Storage 업로드 실패: ${error.message}`);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return { url: data.publicUrl, storage: "supabase" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, fileName), input.buffer);
  return { url: `/api/uploads/${fileName}`, storage: "local" };
}

export function resolveLocalUploadPath(fileName: string): string {
  return path.join(UPLOAD_DIR, fileName);
}
