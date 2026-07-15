import { createClient } from "@supabase/supabase-js";
import type { CollectionStore } from "./collectionStore";

/**
 * Supabase implementation, backed by the single `app_collections` table
 * (see supabase/migrations/0001_app_collections.sql). One JSON-document table backs every
 * migrated registry — `collection` is the registry name (e.g. "users", "design-plans"),
 * `id` is the record id (or a fixed id like "counters" for a singleton doc). This mirrors the
 * existing JSON shapes exactly, so registries' business logic (find/filter/map over the full
 * array) doesn't change — only the load/save I/O primitive does.
 */
export function createSupabaseStore(url: string, serviceRoleKey: string): CollectionStore {
  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async list<T extends { id: string }>(collection: string): Promise<T[]> {
      const { data, error } = await client
        .from("app_collections")
        .select("data")
        .eq("collection", collection);

      if (error) {
        throw new Error(`[supabaseStore] list("${collection}") failed: ${error.message}`);
      }

      return (data ?? []).map((row) => row.data as T);
    },

    async replaceAll<T extends { id: string }>(collection: string, records: T[]): Promise<void> {
      const { error: deleteError } = await client
        .from("app_collections")
        .delete()
        .eq("collection", collection);

      if (deleteError) {
        throw new Error(`[supabaseStore] replaceAll("${collection}") delete failed: ${deleteError.message}`);
      }

      if (records.length === 0) return;

      const rows = records.map((record) => ({
        collection,
        id: record.id,
        data: record,
      }));

      const { error: insertError } = await client.from("app_collections").insert(rows);

      if (insertError) {
        throw new Error(`[supabaseStore] replaceAll("${collection}") insert failed: ${insertError.message}`);
      }
    },

    async getDoc<T>(collection: string, id: string): Promise<T | null> {
      const { data, error } = await client
        .from("app_collections")
        .select("data")
        .eq("collection", collection)
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(`[supabaseStore] getDoc("${collection}", "${id}") failed: ${error.message}`);
      }

      return data ? (data.data as T) : null;
    },

    async setDoc<T>(collection: string, id: string, doc: T): Promise<void> {
      const { error } = await client
        .from("app_collections")
        .upsert({ collection, id, data: doc }, { onConflict: "collection,id" });

      if (error) {
        throw new Error(`[supabaseStore] setDoc("${collection}", "${id}") failed: ${error.message}`);
      }
    },
  };
}
