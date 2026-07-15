import type { CollectionStore } from "./collectionStore";
import { createFsStore } from "./fsStore";
import { createSupabaseStore } from "./supabaseStore";

export type { CollectionStore } from "./collectionStore";
export { createMemoryStore } from "./memoryStore";
export { createFsStore } from "./fsStore";
export { createSupabaseStore } from "./supabaseStore";

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