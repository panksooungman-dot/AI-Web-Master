import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/id";
import { safeExtension } from "./extension";
import type { AttachmentInput, AttachmentStore, StoredAttachment } from "./types";

const BUCKET = "inquiry-attachments";

/** 파일명을 Supabase Storage 오브젝트 키로 안전하게 쓸 수 있도록 정리한다 — 한글·공백·특수문자가
 * 그대로 들어가면 일부 클라이언트/CDN에서 URL 인코딩 문제가 생길 수 있어, 확장자만 보존하고
 * 나머지는 영숫자로 치환한다. 사람이 읽을 원본 파일명은 별도로 항상 보관하므로(레코드의
 * `name` 필드) 여기서 정보가 손실돼도 문제없다. */
function safeKey(name: string): string {
  return `${generateId("attachment")}${safeExtension(name)}`;
}

let bucketEnsured: Promise<void> | null = null;

async function ensureBucket(client: SupabaseClient): Promise<void> {
  if (!bucketEnsured) {
    bucketEnsured = (async () => {
      const { data, error } = await client.storage.listBuckets();
      if (error) throw new Error(`[attachments/supabase] listBuckets failed: ${error.message}`);

      if (!data?.some((bucket) => bucket.name === BUCKET)) {
        const { error: createError } = await client.storage.createBucket(BUCKET, { public: true });
        // RACE: 동시 요청 두 개가 동시에 "버킷 없음"을 보고 둘 다 생성을 시도할 수 있다 —
        // 이미 존재해서 나는 오류는 무시하고, 그 외 실패만 진짜 오류로 취급한다.
        if (createError && !createError.message.includes("already exists")) {
          throw new Error(`[attachments/supabase] createBucket failed: ${createError.message}`);
        }
      }
    })();
  }
  return bucketEnsured;
}

export function createSupabaseAttachmentStore(url: string, serviceRoleKey: string): AttachmentStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async save(input: AttachmentInput): Promise<StoredAttachment> {
      await ensureBucket(client);

      const key = safeKey(input.name);
      const { error } = await client.storage.from(BUCKET).upload(key, input.buffer, {
        contentType: input.contentType,
        upsert: false,
      });

      if (error) {
        throw new Error(`[attachments/supabase] upload("${key}") failed: ${error.message}`);
      }

      const { data } = client.storage.from(BUCKET).getPublicUrl(key);

      return {
        url: data.publicUrl,
        name: input.name,
        contentType: input.contentType,
        size: input.buffer.length,
      };
    },
  };
}
