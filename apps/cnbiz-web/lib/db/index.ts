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

  console.log(
    "[env keys]",
    Object.keys(process.env)
      .filter((k) => k.includes("SUPABASE"))
      .sort()
  );

  console.log("[env values]", {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? "[SET]"
      : undefined,
  });

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[getDefaultStore]", {
    hasUrl: !!url,
    hasKey: !!serviceRoleKey,
    store: url && serviceRoleKey ? "supabase" : "fs",
  });

  cached =
    url && serviceRoleKey
      ? createSupabaseStore(url, serviceRoleKey)
      : createFsStore();

  return cached;
}
