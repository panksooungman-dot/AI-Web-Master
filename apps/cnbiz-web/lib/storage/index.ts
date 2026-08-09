import { createFsAttachmentStore } from "./fsStore";
import { createSupabaseAttachmentStore } from "./supabaseStore";

export type { AttachmentInput, AttachmentStore, StoredAttachment } from "./types";
export { readFsAttachment } from "./fsStore";

let cached: import("./types").AttachmentStore | null = null;

/** lib/db/index.ts의 getDefaultStore()와 동일한 선택 규칙 — Production에서 Supabase 설정이
 * 없으면 조용히 로컬 fs로 폴백하지 않고 즉시 실패한다(값이 비어 있는 것과 잘못 설정된 것을
 * 겉으로 구분하기 어려운 상태를 만들지 않기 위해). */
export function getDefaultAttachmentStore(): import("./types").AttachmentStore {
  if (cached) return cached;

  const isProd = process.env.NODE_ENV === "production";
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (isProd) {
    if (!url) throw new Error("[Production misconfig] SUPABASE_URL is missing");
    if (!serviceRoleKey) throw new Error("[Production misconfig] SUPABASE_SERVICE_ROLE_KEY is missing");
  }

  cached = url && serviceRoleKey ? createSupabaseAttachmentStore(url, serviceRoleKey) : createFsAttachmentStore();
  return cached;
}
