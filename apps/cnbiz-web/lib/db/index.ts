import type { CollectionStore } from "./collectionStore";
import { createFsStore } from "./fsStore";
import { createSupabaseStore } from "./supabaseStore";

export type { CollectionStore } from "./collectionStore";
export { createMemoryStore } from "./memoryStore";
export { createFsStore } from "./fsStore";
export { createSupabaseStore } from "./supabaseStore";

let cached: CollectionStore | null = null;

/**
 * Supabase when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are set (production), otherwise the
 * fs-backed store (local `next dev`/`next start` with no setup required). Registries call this
 * with no arguments in production code; tests inject their own `createMemoryStore()` instance
 * instead, the same way they used to inject a temp `baseDir`.
 */
export function getDefaultStore(): CollectionStore {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cached = url && serviceRoleKey ? createSupabaseStore(url, serviceRoleKey) : createFsStore();
  return cached;
}
