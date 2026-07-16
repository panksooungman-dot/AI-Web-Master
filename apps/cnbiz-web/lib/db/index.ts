import { createFsStore } from "./fsStore";
import { createSupabaseStore } from "./supabaseStore";

export { createMemoryStore } from "./memoryStore";
export { createFsStore } from "./fsStore";
export { createSupabaseStore } from "./supabaseStore";

// Vercel 빌드에서 type 심볼 스코프가 깨지는 문제를 피하려고,
// import type 대신 import()로 타입을 직접 참조합니다.
type CollectionStore = import("./collectionStore").CollectionStore;

let cached: CollectionStore | null = null;

export function getDefaultStore(): CollectionStore {
  if (cached) return cached;

  // NODE_ENV=production은 Vercel(Production/Preview 모두)과 `next start`에서 설정되고,
  // `next dev`에서는 development이므로 로컬 개발에는 영향을 주지 않는다.
  const isProd = process.env.NODE_ENV === "production";

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[getDefaultStore]", {
    isProd,
    hasUrl: !!url,
    hasKey: !!serviceRoleKey,
    storeWillBe: url && serviceRoleKey ? "supabase" : isProd ? "throw" : "fs",
  });

  if (isProd) {
    if (!url) throw new Error("[Production misconfig] SUPABASE_URL is missing");
    if (!serviceRoleKey) {
      throw new Error("[Production misconfig] SUPABASE_SERVICE_ROLE_KEY is missing");
    }
  }

  cached =
    url && serviceRoleKey
      ? createSupabaseStore(url, serviceRoleKey)
      : createFsStore();

  return cached;
}
